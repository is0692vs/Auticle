from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import asyncio
import subprocess
import json
import tempfile
import os
from typing import List, Dict, Any
import aiofiles
import edge_tts
import logging

# ログ設定
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="Audicle API Server", version="1.0.0")

# Request models
class ExtractRequest(BaseModel):
    url: str

class SynthesizeRequest(BaseModel):
    text: str
    voice: str = "ja-JP-NanamiNeural"

# Response models
class ExtractResponse(BaseModel):
    title: str
    chunks: List[str]

@app.get("/")
async def root():
    return {"message": "Audicle API Server is running", "version": "1.0.0"}

@app.post("/extract", response_model=ExtractResponse)
async def extract_content(request: ExtractRequest):
    """URLから本文を抽出する"""
    try:
        # Node.jsスクリプトを実行してReadability.jsで本文抽出
        result = subprocess.run(
            ["node", "readability_script.js", request.url],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"Extraction failed: {result.stderr}")
        
        # JSONレスポンスをパース
        extracted_data = json.loads(result.stdout)
        
        return ExtractResponse(
            title=extracted_data.get("title", ""),
            chunks=extracted_data.get("chunks", [])
        )
    
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Extraction timeout")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse extraction result")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/synthesize")
async def synthesize_speech(request: SynthesizeRequest):
    """テキストを音声化してMP3を返す"""
    max_retries = 3
    retry_delay = 1  # 秒
    last_error = None
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Synthesizing text (attempt {attempt + 1}/{max_retries}): {request.text}")
            logger.info(f"Using voice: {request.voice}")
            
            # edge-ttsを使用して音声合成
            communicate = edge_tts.Communicate(request.text, request.voice)
            
            # 一時ファイルに音声データを保存
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                temp_path = temp_file.name
                
            logger.info(f"Saving audio to temporary file: {temp_path}")
            await communicate.save(temp_path)
            
            # 音声ファイルを読み込んでレスポンス
            async with aiofiles.open(temp_path, "rb") as audio_file:
                audio_data = await audio_file.read()
            
            logger.info(f"Audio data size: {len(audio_data)} bytes")
            
            # 一時ファイルを削除
            os.unlink(temp_path)
            
            return Response(
                content=audio_data,
                media_type="audio/mpeg",
                headers={"Content-Disposition": "attachment; filename=speech.mp3"}
            )
            
        except Exception as e:
            last_error = e
            logger.error(f"Synthesis error (attempt {attempt + 1}): {str(e)}")
            
            # 最後の試行でない場合は少し待つ
            if attempt < max_retries - 1:
                logger.info(f"Waiting {retry_delay} seconds before retry...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # 指数バックオフ
            else:
                # 全ての試行が失敗した場合のフォールバック
                logger.error(f"All {max_retries} attempts failed. Using fallback.")
                break
    
    # フォールバック処理
    try:
        logger.info("Attempting fallback: returning test audio file")
        
        # フォールバック用の音声ファイルが存在するかチェック
        fallback_path = "fallback.mp3"
        if os.path.exists(fallback_path):
            async with aiofiles.open(fallback_path, "rb") as fallback_file:
                fallback_audio = await fallback_file.read()
            
            return Response(
                content=fallback_audio,
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": "attachment; filename=fallback.mp3",
                    "X-Fallback": "true",
                    "X-Error": str(last_error) if last_error else "Unknown error"
                }
            )
        else:
            # フォールバックファイルが存在しない場合は、空のレスポンス
            logger.warning("Fallback audio file not found, returning empty response")
            return Response(
                content=b"",
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": "attachment; filename=empty.mp3",
                    "X-Fallback": "true",
                    "X-Error": str(last_error) if last_error else "Unknown error"
                }
            )
            
    except Exception as fallback_error:
        logger.error(f"Fallback also failed: {str(fallback_error)}")
        raise HTTPException(
            status_code=500,
            detail=f"Synthesis failed: {str(last_error) if last_error else 'Unknown error'}. Fallback failed: {str(fallback_error)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)