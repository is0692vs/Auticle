# Audicle API Server

This API server provides text extraction from web pages and text-to-speech synthesis using Google Cloud Text-to-Speech.

## Features

- **Text Extraction**: Extract readable content from web pages using Readability.js
- **Text-to-Speech**: Convert text to speech using Google Cloud Text-to-Speech API

## Setup

### Prerequisites

- Python 3.11+
- Node.js (for text extraction)
- Google Cloud Platform account with Text-to-Speech API enabled

### Installation

1. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Set up Google Cloud credentials:
   - Create a service account in Google Cloud Console
   - Download the JSON key file
   - Place the key file in `credentials/service-account.json`
   - The environment variable `GOOGLE_APPLICATION_CREDENTIALS` will be set automatically in Docker

### Running with Docker

```bash
docker-compose up --build
```

The server will be available at `http://localhost:8000`

## API Endpoints

### GET /

Returns server status information.

### POST /extract

Extract text content from a web page.

**Request:**

```json
{
  "url": "https://example.com"
}
```

**Response:**

```json
{
  "title": "Page Title",
  "chunks": ["Text chunk 1", "Text chunk 2", ...]
}
```

### POST /synthesize

Convert text to speech.

**Request:**

```json
{
  "text": "Hello, world!",
  "voice": "ja-JP-Wavenet-B"
}
```

**Response:** MP3 audio file

## Configuration

- Default voice: `ja-JP-Wavenet-B` (Japanese)
- Audio format: MP3
- Fallback audio file: `fallback.mp3` (if synthesis fails)

## Development

To run locally without Docker:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
python main.py
```
