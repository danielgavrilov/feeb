from __future__ import annotations

import base64
import json
from typing import Dict, List, Optional

import httpx

from ..config import settings


class GeminiClient:
    """Minimal client for Google Gemini (Flash Lite) JSON extraction.

    We call the REST API directly and request application/json output.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None) -> None:
        self.api_key = api_key or settings.gemini_api_key or settings.llm_api_key
        self.model = model or settings.gemini_model
        if not self.api_key:
            raise RuntimeError("Gemini API key not configured")

    def _endpoint(self) -> str:
        # v1beta models generateContent: https://ai.google.dev/gemini-api/docs/text-generation
        return f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

    async def extract_from_payload(
        self,
        *,
        prompt: str,
        text: Optional[str] = None,
        inline_mime_type: Optional[str] = None,
        inline_base64: Optional[str] = None,
        url: Optional[str] = None,
    ) -> List[Dict]:
        """Send a structured request asking for pure JSON output.

        Returns a Python list of dish dicts (may be empty).
        """

        contents: List[Dict] = []

        # System-style instruction to enforce JSON only
        system_instruction = {
            "role": "user",
            "parts": [{"text": prompt}],
        }
        contents.append(system_instruction)

        # Attach text or inline_data or URL
        if text:
            contents.append({"role": "user", "parts": [{"text": text}]})
        elif inline_base64 and inline_mime_type:
            contents.append(
                {
                    "role": "user",
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": inline_mime_type,
                                "data": inline_base64,
                            }
                        }
                    ],
                }
            )
        elif url:
            contents.append({"role": "user", "parts": [{"text": url}]})

        generation_config = {
            "temperature": 0,
            "response_mime_type": "application/json",
        }

        payload = {
            "contents": contents,
            "generationConfig": generation_config,
            # thinkingConfig not supported on flash-lite; omit
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(self._endpoint(), json=payload)
            resp.raise_for_status()
            data = resp.json()

        # Gemini JSON may be in candidates[0].content.parts[0].text
        text_out: Optional[str] = None
        try:
            candidates = data.get("candidates") or []
            if candidates:
                parts = (
                    candidates[0]
                    .get("content", {})
                    .get("parts", [])
                )
                if parts and isinstance(parts[0], dict):
                    text_out = parts[0].get("text")
        except Exception:  # defensive
            text_out = None

        if not text_out:
            return []

        # Ensure it's valid JSON array or object with recipes field
        parsed: object
        try:
            parsed = json.loads(text_out)
        except json.JSONDecodeError:
            # Try to trim code fences if any leaked
            cleaned = text_out.strip().strip("`")
            parsed = json.loads(cleaned)

        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            items = parsed.get("recipes") or parsed.get("items")
            return items if isinstance(items, list) else []
        return []


def to_base64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


