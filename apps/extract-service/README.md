# LangExtract service

Minimal HTTP wrapper around [LangExtract](https://github.com/google/langextract) for local testing. No other apps call it yet.

**Requirements:** Python 3.10+

## Setup

```bash
cd apps/extract-service
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set `LANGEXTRACT_API_KEY` (or `GOOGLE_AI_API_KEY`) for Gemini.

## Run

```bash
uvicorn main:app --reload --port 8000
```

- Health: `GET http://localhost:8000/health`
- Extract: `POST http://localhost:8000/extract` with JSON body (see below)

## POST /extract body

```json
{
  "text": "Lady Juliet gazed longingly at the stars, her heart aching for Romeo",
  "prompt_description": "Extract characters, emotions, and relationships. Use exact text. Do not paraphrase.",
  "examples": [
    {
      "text": "ROMEO. But soft! What light through yonder window breaks?",
      "extractions": [
        { "extraction_class": "character", "extraction_text": "ROMEO", "attributes": {"emotional_state": "wonder"} },
        { "extraction_class": "emotion", "extraction_text": "But soft!", "attributes": {"feeling": "gentle awe"} }
      ]
    }
  ],
  "model_id": "gemini-2.5-flash"
}
```

Response: `{"documents": [{"text": "...", "extractions": [...]}]}`
