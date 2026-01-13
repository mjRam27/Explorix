# ai/llama_client.py
import httpx

LLAMA_URL = "http://127.0.0.1:8080/completion"


def messages_to_prompt(messages: list[dict]) -> str:
    prompt = ""

    for m in messages:
        if m["role"] == "system":
            prompt += f"<|system|>\n{m['content'].strip()}\n"
        elif m["role"] == "user":
            prompt += f"<|user|>\n{m['content'].strip()}\n"
        elif m["role"] == "assistant":
            prompt += f"<|assistant|>\n{m['content'].strip()}\n"

    prompt += "<|assistant|>\n"
    return prompt


async def generate_from_llama(messages):
    prompt = messages_to_prompt(messages)

    payload = {
    "prompt": prompt,
    "n_predict": 200,
    "temperature": 0.6,
    "top_p": 0.9,
    "repeat_penalty": 1.1,
    "stop": ["<|user|>"]
    }

    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(LLAMA_URL, json=payload)
        r.raise_for_status()
        return r.json()["content"].strip()
