"use client";

import { Chunk } from "@/types/api";

interface ReaderViewProps {
  chunks?: Chunk[];
  currentChunkId?: string;
  onChunkClick?: (chunkId: string) => void;
}

export default function ReaderView({
  chunks = [],
  currentChunkId,
  onChunkClick,
}: ReaderViewProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {chunks.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
            <p className="text-lg">URLを入力して記事を読み込んでください</p>
          </div>
        ) : (
          <div className="space-y-6">
            {chunks.map((chunk) => {
              const isActive = chunk.id === currentChunkId;
              return (
                <p
                  key={chunk.id}
                  data-auticle-id={chunk.id}
                  onClick={() => onChunkClick?.(chunk.id)}
                  className={`
                    text-lg leading-relaxed cursor-pointer transition-all duration-200 p-4 rounded-lg
                    ${
                      isActive
                        ? "bg-yellow-100 dark:bg-yellow-900/30 font-medium scale-105"
                        : "hover:bg-gray-100 dark:hover:bg-gray-900"
                    }
                  `}
                >
                  {chunk.text}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
