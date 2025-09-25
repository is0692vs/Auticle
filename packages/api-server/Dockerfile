# Python 3.11をベースとして使用
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# Node.jsをインストール
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係をコピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Node.js依存関係をコピーしてインストール
COPY package.json .
RUN npm install

# アプリケーションファイルをコピー
COPY main.py .
COPY readability_script.js .
COPY fallback.mp3 .

# ポートを公開
EXPOSE 8000

# アプリケーションを起動
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]