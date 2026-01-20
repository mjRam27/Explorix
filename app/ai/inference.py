# ai/inference.py
import torch
from ai.model_loader import load_explorix_model

model, tokenizer = load_explorix_model()

def build_chat_prompt(messages):
    prompt = ""
    for msg in messages:
        role = msg["role"].capitalize()
        content = msg["content"]
        prompt += f"### {role}:\n{content}\n\n"

    prompt += "### Assistant:\n"
    return prompt


def generate_explorix_response(
    question: str,
    history: list | None = None
):
    history = history or []

    messages = [
        {
            "role": "system",
            "content": (
                "You are Explorix AI, a travel and exploration assistant built by Manoj Padmanabha.\n\n"
                "You help users understand journeys, transportation options, and places to explore "
                "in a calm, enthusiastic, and adventurous tone.\n\n"
                "Your responses should feel friendly, inspiring, and reliable.\n"
                "Do not mention internal systems, databases, tables, or technical implementation details.\n"
                "If information is missing or uncertain, clearly explain the limitation without guessing.\n"
                "Do not claim to be ChatGPT or any other assistant."
            )
        }
    ]

    # 🔹 Inject conversation history
    for msg in history:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })

    # 🔹 Current user question
    messages.append({
        "role": "user",
        "content": question
    })

    prompt = build_chat_prompt(messages)

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=150,
            min_new_tokens=20,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id,
        )

    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)

    return decoded.split("### Assistant:")[-1].strip()
