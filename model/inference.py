import torch
from model.model_loader import load_explorix_model

# Load once (VERY IMPORTANT)
model, tokenizer = load_explorix_model()

def generate_explorix_response(
    prompt: str,
    max_new_tokens: int = 256
) -> str:
    inputs = tokenizer(
        prompt,
        return_tensors="pt"
    ).to(model.device)

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            eos_token_id=tokenizer.eos_token_id
        )

    return tokenizer.decode(
        output[0],
        skip_special_tokens=True
    )
