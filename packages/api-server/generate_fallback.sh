#!/bin/bash
# シンプルなビープ音を生成するスクリプト（ffmpegが利用可能な場合）

# ビープ音の生成（1秒間、440Hz）
if command -v ffmpeg >/dev/null 2>&1; then
    echo "Generating fallback audio using ffmpeg..."
    ffmpeg -f lavfi -i "sine=frequency=440:duration=1" -y fallback.mp3
    echo "Fallback audio generated: fallback.mp3"
else
    echo "ffmpeg not found. Please install ffmpeg to generate proper fallback audio."
    echo "For now, using empty file as fallback."
fi