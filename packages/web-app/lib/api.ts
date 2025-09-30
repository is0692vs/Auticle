import {
  ExtractRequest,
  ExtractResponse,
  SynthesizeRequest,
} from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * URLから本文を抽出する
 */
export async function extractContent(
  url: string
): Promise<ExtractResponse> {
  const request: ExtractRequest = { url };

  const response = await fetch(`${API_BASE_URL}/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`抽出に失敗しました: ${error}`);
  }

  return response.json();
}

/**
 * テキストを音声に変換する
 * @returns 音声データのBlobを返す
 */
export async function synthesizeSpeech(
  text: string,
  voice: string = "ja-JP-Wavenet-B"
): Promise<Blob> {
  const request: SynthesizeRequest = { text, voice };

  const response = await fetch(`${API_BASE_URL}/synthesize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`音声合成に失敗しました: ${error}`);
  }

  return response.blob();
}
