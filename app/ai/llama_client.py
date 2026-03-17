# ai/llama_client.py
import httpx

LLAMA_URL = "http://127.0.0.1:8080/completion"


def messages_to_prompt(messages):
    prompt = ""

    for m in messages:
        role = m["role"].capitalize()
        content = m["content"]
        prompt += f"### {role}:\n{content}\n\n"

    prompt += "### Assistant:\n"
    return prompt


async def generate_from_llama(messages):
    prompt = messages_to_prompt(messages)

    payload = {
    "prompt": prompt,
    "n_predict": 200,
    "temperature": 0.3,
    "top_p": 0.9,
    "repeat_penalty": 1.2,
    "stop": ["### User:", "### Assistant:"]
    }

    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(LLAMA_URL, json=payload)
        r.raise_for_status()
        data = r.json()
        content = data.get("content", "").strip()

        if "### Assistant:" in content:
            content = content.split("### Assistant:")[-1].strip()

        return content