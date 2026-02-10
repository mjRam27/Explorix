# app/rag/llm_service.py

import re
from ai.llama_client import generate_from_llama


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
        raw = await generate_from_llama(messages)
        cleaned = self._sanitize_chat_output(raw)
        return cleaned or "Sorry, I could not generate a useful answer right now."

    def _sanitize_chat_output(self, text: str) -> str:
        if not text:
            return ""

        # Remove common prompt-echo markers produced by local llama servers.
        cleaned = re.sub(r"<\|/?(?:system|user|assistant)\|>", "", text, flags=re.IGNORECASE)
        cleaned = cleaned.strip()

        lower = cleaned.lower()
        leak_markers = (
            "you are explorix ai",
            "do not mention internal",
            "respond naturally",
            "use only places provided in the context",
            "system instructions",
        )

        # If the model echoes instructions, drop those lines and keep only answer lines.
        if any(marker in lower for marker in leak_markers):
            kept_lines = []
            for line in cleaned.splitlines():
                line_l = line.strip().lower()
                if not line_l:
                    if kept_lines:
                        kept_lines.append("")
                    continue
                if any(marker in line_l for marker in leak_markers):
                    continue
                if line_l.startswith(("you are ", "do not ", "use only ", "when the user asks")):
                    continue
                kept_lines.append(line.rstrip())
            cleaned = "\n".join(kept_lines).strip()

        return cleaned

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
