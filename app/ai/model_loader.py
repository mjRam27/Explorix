import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import os

BASE_MODEL = "meta-llama/Llama-3.2-3B"

HF_TOKEN = os.getenv("HF_TOKEN")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LORA_PATH = os.path.join(BASE_DIR, "lora")

def load_explorix_model():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    tokenizer = AutoTokenizer.from_pretrained(
        BASE_MODEL,
        use_fast=False,
        token=HF_TOKEN
    )
    tokenizer.pad_token = tokenizer.eos_token

    # ✅ IMPORTANT: NO device_map here
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=dtype,
        trust_remote_code=True,
        token=HF_TOKEN
    )

    # Move base model FIRST
    base_model.to(device)

    # Now attach LoRA (safe)
    model = PeftModel.from_pretrained(
        base_model,
        LORA_PATH,
        is_trainable=False
    )

    model.eval()
    return model, tokenizer
