"use client";

import { useState } from "react";
import ReaderView from "@/components/ReaderView";
import { Chunk } from "@/types/api";
import { extractContent } from "@/lib/api";
import { usePlayback } from "@/hooks/usePlayback";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  // 再生制御フック
  const {
    isPlaying,
    isLoading: isPlaybackLoading,
    error: playbackError,
    currentChunkId,
    play,
    pause,
    stop,
    seekToChunk,
  } = usePlayback({ chunks });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await extractContent(url);
      
      // chunksにIDを付与
      const chunksWithId: Chunk[] = response.chunks.map((text, index) => ({
        id: `chunk-${index}`,
        text,
      }));

      setChunks(chunksWithId);
      setTitle(response.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      console.error("Extract error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー: URL入力欄 */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Auticle</h1>
          {title && (
            <h2 className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {title}
            </h2>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="記事のURLを入力してください"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "読込中..." : "読込"}
            </button>
          </form>
          {error && (
            <div className="mt-2 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          {playbackError && (
            <div className="mt-2 text-red-600 dark:text-red-400 text-sm">
              {playbackError}
            </div>
          )}
          
          {/* 再生コントロール */}
          {chunks.length > 0 && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={isPlaying ? pause : play}
                disabled={isPlaybackLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isPlaybackLoading
                  ? "処理中..."
                  : isPlaying
                  ? "一時停止"
                  : "再生"}
              </button>
              <button
                onClick={stop}
                disabled={!isPlaying && !isPlaybackLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                停止
              </button>
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ: リーダービュー */}
      <main className="flex-1 overflow-hidden">
        <ReaderView
          chunks={chunks}
          currentChunkId={currentChunkId}
          onChunkClick={seekToChunk}
        />
      </main>
    </div>
  );
}
