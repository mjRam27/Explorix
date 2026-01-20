# app/rag/llm_service.py

from ai.llama_client import generate_from_llama


class LLMService:
    """
    Unified LLM interface for chat + itinerary + future AI features.
    """

    async def generate_response(
        self,
        prompt: str,
        context: str
    ) -> str:

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert travel planner. "
                    "Return ONLY valid JSON. "
                    "Use ONLY the provided context."
                )
            },
            {
                "role": "user",
                "content": f"CONTEXT:\n{context}\n\nTASK:\n{prompt}"
            }
        ]

        return await generate_from_llama(messages)


llm_service = LLMService()
