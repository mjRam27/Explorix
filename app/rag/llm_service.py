# app/rag/llm_service.py

from ai.llama_client import generate_from_llama
import re


class LLMService:
    """
    Unified LLM interface with TWO modes:
    - free text (chat)
    - strict structured JSON (itinerary)
    """

    # =====================================================
    # 🟢 FREE-TEXT GENERATION (CHAT)
    # =====================================================
    async def generate_text(self, messages: list[dict]) -> str:
        """
        Used by /explorix/chat
        Returns human-readable text.
        """
        return await generate_from_llama(messages)

    # =====================================================
    # 🔵 STRICT JSON GENERATION (ITINERARY)
    # =====================================================
    async def generate_json(self, prompt: str, context: str) -> str:
        """
        Used ONLY by itinerary AI generation.
        Forces JSON output.
        """

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a JSON-only generator.\n"
                    "You MUST return ONLY valid JSON.\n"
                    "No explanations.\n"
                    "No markdown.\n"
                    "No text outside JSON."
                )
            },
            {
                "role": "user",
                "content": (
                    f"CONTEXT (use ONLY these places):\n"
                    f"{context}\n\n"
                    f"TASK:\n{prompt}"
                )
            }
        ]

        raw = await generate_from_llama(messages)

        if not raw or not raw.strip():
            raise ValueError("LLM returned empty response")

        # Extract JSON defensively
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError(f"Invalid JSON output:\n{raw}")

        return match.group(0)


llm_service = LLMService()
