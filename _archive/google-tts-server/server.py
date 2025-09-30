"""Google Cloud Text-to-Speech Docker API Server for Audicle.

Exposes a FastAPI wrapper around Google Cloud TTS so Audicle can request audio
over HTTP, similar to the existing Edge TTS docker service.
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from google.api_core.exceptions import GoogleAPICallError, RetryError
from google.cloud import texttospeech
from pydantic import BaseModel, field_validator

logger = logging.getLogger("google_tts_server")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Docker Google Cloud TTS Server", version="1.0.0")

_DEFAULT_VOICE = os.getenv("GOOGLE_TTS_DEFAULT_VOICE", "ja-JP-Wavenet-B")
_DEFAULT_LANGUAGE_CODE = os.getenv("GOOGLE_TTS_LANGUAGE_CODE", "ja-JP")

_client: Optional[texttospeech.TextToSpeechClient] = None


def _get_client() -> texttospeech.TextToSpeechClient:
    """Lazily instantiate the Google Cloud TTS client."""
    global _client

    if _client is not None:
        return _client

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not credentials_path:
        raise RuntimeError(
            "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set."
        )

    if not os.path.exists(credentials_path):
        raise RuntimeError(
            "Credentials file not found at "
            f"'{credentials_path}'. Verify docker-compose volume mapping."
        )

    logger.info("Initialising Google Cloud Text-to-Speech client")
    _client = texttospeech.TextToSpeechClient()
    return _client


class HealthResponse(BaseModel):
    status: str
    message: str
    version: str
    default_voice: str
    language_code: str


class SynthesizeRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    language_code: Optional[str] = None
    speaking_rate: Optional[float] = None
    pitch: Optional[float] = None
    sample_rate_hertz: Optional[int] = None

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("text must not be empty")
        return value.strip()


@app.on_event("startup")
async def on_startup() -> None:
    """Validate configuration early so container failures are visible."""
    try:
        _get_client()
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Failed to initialise Google Cloud TTS client: %s", exc)
        raise


@app.get("/", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return basic health information."""
    return HealthResponse(
        status="ok",
        message="Docker Google Cloud TTS Server is running",
        version="1.0.0",
        default_voice=_DEFAULT_VOICE,
        language_code=_DEFAULT_LANGUAGE_CODE,
    )


@app.get("/voices")
async def list_voices() -> dict:
    """Return voices filtered to the configured language when possible."""
    client = _get_client()

    def _list() -> list[dict[str, str]]:
        response = client.list_voices()
        voices = []
        for voice in response.voices:
            if _DEFAULT_LANGUAGE_CODE and not any(
                locale.startswith(_DEFAULT_LANGUAGE_CODE)
                for locale in voice.language_codes
            ):
                continue
            voices.append(
                {
                    "name": voice.name,
                    "language_codes": list(voice.language_codes),
                    "ssml_gender": texttospeech.SsmlVoiceGender(
                        voice.ssml_gender
                    ).name,
                    "natural_sample_rate_hertz": (
                        voice.natural_sample_rate_hertz
                    ),
                }
            )
        return voices

    voices = await asyncio.to_thread(_list)
    return {"voices": voices, "count": len(voices)}


async def _synthesize_to_bytes(request: SynthesizeRequest) -> bytes:
    client = _get_client()
    voice_name = request.voice or _DEFAULT_VOICE
    language_code = request.language_code or _DEFAULT_LANGUAGE_CODE

    synthesis_input = texttospeech.SynthesisInput(text=request.text)

    voice_params = texttospeech.VoiceSelectionParams(
        language_code=language_code,
        name=voice_name,
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=request.speaking_rate,
        pitch=request.pitch,
        sample_rate_hertz=request.sample_rate_hertz,
    )

    def _call_api() -> bytes:
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config,
        )
        return response.audio_content

    try:
        return await asyncio.to_thread(_call_api)
    except (GoogleAPICallError, RetryError) as exc:
        logger.error("Google Cloud TTS API error: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"Google Cloud TTS error: {exc}",
        )
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.error("Unexpected synthesis error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")


@app.post("/synthesize")
async def synthesize(request: SynthesizeRequest) -> StreamingResponse:
    """Synthesize speech for the given text and return it as an MP3 stream."""
    audio_content = await _synthesize_to_bytes(request)
    audio_stream = io.BytesIO(audio_content)

    return StreamingResponse(
        audio_stream,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "attachment; filename=speech.mp3"},
    )


@app.post("/synthesize/simple")
async def synthesize_simple(payload: dict) -> StreamingResponse:
    """Backward compatible endpoint that accepts {"text": "..."}."""
    text = str(payload.get("text", ""))
    request = SynthesizeRequest(text=text)
    return await synthesize(request)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8002"))
    logger.info("Starting Docker Google Cloud TTS Server on port %s", port)
    uvicorn.run("server:app", host="0.0.0.0", port=port)
