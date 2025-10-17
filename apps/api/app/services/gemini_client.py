from __future__ import annotations

import base64
import json
import re
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
        except json.JSONDecodeError as e:
            # Try to clean the response more aggressively
            cleaned = text_out.strip()
            
            # Remove markdown code fences if present
            if cleaned.startswith("```"):
                # Find the first newline after ```
                first_newline = cleaned.find('\n')
                if first_newline > 0:
                    cleaned = cleaned[first_newline + 1:]
                # Remove trailing ```
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3].strip()
            
            # Remove any leading/trailing backticks
            cleaned = cleaned.strip("`").strip()
            
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError as e2:
                # If still failing, try to find and extract valid JSON
                # Sometimes the response has extra text before/after or is truncated
                
                # Strategy 1: Try to extract complete JSON array/object
                json_match = re.search(r'(\[.*\]|\{.*\})', cleaned, re.DOTALL)
                if json_match:
                    try:
                        parsed = json.loads(json_match.group(1))
                    except json.JSONDecodeError:
                        # Strategy 2: If JSON is an array, try to salvage partial items
                        # Find the last valid complete object before the truncation
                        if cleaned.strip().startswith('['):
                            parsed = self._extract_partial_json_array(cleaned)
                            if parsed:
                                print(f"WARNING: JSON was truncated. Extracted {len(parsed)} partial items.")
                                return parsed if isinstance(parsed, list) else []
                        
                        # Last resort: log error and return empty list
                        print(f"Failed to parse JSON after all attempts. Error: {e2}")
                        print(f"First 500 chars: {text_out[:500]}")
                        print(f"Last 200 chars: {text_out[-200:]}")
                        return []
                else:
                    print(f"No JSON structure found in response. Error: {e2}")
                    return []

        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            items = parsed.get("recipes") or parsed.get("items")
            return items if isinstance(items, list) else []
        return []

    def _extract_partial_json_array(self, text: str) -> Optional[list]:
        """Try to extract valid items from a truncated JSON array.
        
        If the JSON is like: [{"item": 1}, {"item": 2}, {"incomplete...
        We try to extract the complete items before the truncation.
        """
        try:
            # Find the last complete object by searching for pattern: }, followed by optional whitespace
            # We'll progressively try to parse smaller substrings
            
            # Remove the opening bracket
            if not text.strip().startswith('['):
                return None
            
            content = text.strip()[1:]  # Remove opening [
            
            # Try to find the last complete item by looking for "}," or "}"
            # Split by pattern that indicates end of object
            items = []
            depth = 0
            current_item = ""
            in_string = False
            escape_next = False
            
            for char in content:
                if escape_next:
                    current_item += char
                    escape_next = False
                    continue
                    
                if char == '\\':
                    escape_next = True
                    current_item += char
                    continue
                
                if char == '"' and not escape_next:
                    in_string = not in_string
                    current_item += char
                    continue
                
                if in_string:
                    current_item += char
                    continue
                
                if char == '{':
                    depth += 1
                    current_item += char
                elif char == '}':
                    depth -= 1
                    current_item += char
                    
                    # If we're back at depth 0, we have a complete object
                    if depth == 0:
                        try:
                            obj = json.loads(current_item.strip())
                            items.append(obj)
                            current_item = ""
                        except json.JSONDecodeError:
                            # This item is malformed, skip it
                            current_item = ""
                elif char == ',':
                    if depth == 0:
                        # Comma between items, reset
                        current_item = ""
                    else:
                        current_item += char
                else:
                    current_item += char
            
            return items if items else None
        except Exception as e:
            print(f"Error extracting partial JSON: {e}")
            return None


def to_base64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


