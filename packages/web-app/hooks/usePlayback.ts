"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Chunk } from "@/types/api";
import { synthesizeSpeech } from "@/lib/api";

interface UsePlaybackProps {
  chunks: Chunk[];
  onChunkChange?: (chunkId: string) => void;
}

export function usePlayback({ chunks, onChunkChange }: UsePlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // 現在のチャンクID
  const currentChunkId =
    currentIndex >= 0 && currentIndex < chunks.length
      ? chunks[currentIndex].id
      : undefined;

  // 音声URLのクリーンアップ
  const cleanupAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // 特定のインデックスから再生
  const playFromIndex = useCallback(
    async (index: number) => {
      if (index < 0 || index >= chunks.length) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const chunk = chunks[index];

        // 音声を合成
        const audioBlob = await synthesizeSpeech(chunk.text);

        // 古いURLをクリーンアップ
        cleanupAudioUrl();

        // 新しい音声URLを作成
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;

        // Audio要素を作成して再生
        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          // 次のチャンクがあれば自動的に再生
          if (index + 1 < chunks.length) {
            playFromIndex(index + 1);
          } else {
            setIsPlaying(false);
            setCurrentIndex(-1);
          }
        };

        audio.onerror = () => {
          setError("音声の再生に失敗しました");
          setIsPlaying(false);
        };

        await audio.play();
        setCurrentIndex(index);
        setIsPlaying(true);
        onChunkChange?.(chunk.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    },
    [chunks, cleanupAudioUrl, onChunkChange]
  );

  // 再生開始
  const play = useCallback(() => {
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    playFromIndex(startIndex);
  }, [currentIndex, playFromIndex]);

  // 一時停止
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // 停止
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    cleanupAudioUrl();
    setIsPlaying(false);
    setCurrentIndex(-1);
  }, [cleanupAudioUrl]);

  // 特定のチャンクから再生（Seek機能）
  const seekToChunk = useCallback(
    (chunkId: string) => {
      const index = chunks.findIndex((chunk) => chunk.id === chunkId);
      if (index >= 0) {
        playFromIndex(index);
      }
    },
    [chunks, playFromIndex]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      cleanupAudioUrl();
    };
  }, [cleanupAudioUrl]);

  return {
    isPlaying,
    isLoading,
    error,
    currentChunkId,
    currentIndex,
    play,
    pause,
    stop,
    seekToChunk,
  };
}
