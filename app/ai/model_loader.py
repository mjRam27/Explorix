import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import os

BASE_MODEL = "meta-llama/Llama-3.2-3B"
LORA_PATH = "model/explorix-lora"

HF_TOKEN = os.getenv("HF_TOKEN")

def load_explorix_model():
    tokenizer = AutoTokenizer.from_pretrained(
        BASE_MODEL,
        use_fast=False,
        token=HF_TOKEN
    )

    # IMPORTANT for LLaMA
    tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16,
        device_map=None,            # ✅ FIX
        trust_remote_code=True,     # ✅ SAFETY
        token=HF_TOKEN
    )

    model = PeftModel.from_pretrained(
        base_model,
        LORA_PATH,
        is_trainable=False
    )

    model.eval()
    return model, tokenizer
