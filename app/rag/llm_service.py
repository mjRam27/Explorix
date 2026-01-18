# app/rag/llm_service.py

from ai.llama_client import generate_from_llama
import re


class LLMService:
    """
    Unified LLM interface with TWO modes:
    - free text (chat)
    - structured JSON (itinerary)
    """

    # =====================================================
    # 🟢 FREE-TEXT GENERATION (CHAT)
    # =====================================================
    async def generate_text(
        self,
        messages: list[dict]
    ) -> str:
        return await generate_from_llama(messages)

    # =====================================================
    # 🔵 STRUCTURED JSON GENERATION (ITINERARY)
    # =====================================================
    async def generate_json(
        self,
        prompt: str,
        context: str
    ) -> str:

        # --- First attempt (gentle) ---
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a travel planner.\n"
                    "Return the result as a JSON object.\n"
                    "Do not include explanations or markdown."
                )
            },
            {
                "role": "user",
                "content": (
                    f"PLACES:\n{context}\n\n"
                    f"INSTRUCTIONS:\n{prompt}"
                )
            }
        ]

        raw = await generate_from_llama(messages)

        # --- Retry once if empty ---
        if not raw or not raw.strip():
            retry_messages = [
                {
                    "role": "system",
                    "content": "Return ONLY a JSON object."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            raw = await generate_from_llama(retry_messages)

        if not raw or not raw.strip():
            raise ValueError("LLM returned empty response after retry")

        # --- Extract JSON defensively ---
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError(f"Invalid JSON output:\n{raw}")

        return match.group(0)


llm_service = LLMService()
