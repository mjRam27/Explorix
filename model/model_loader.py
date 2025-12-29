import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

BASE_MODEL = "meta-llama/Llama-3.2-3B"
LORA_PATH = "model/explorix-lora"


def load_explorix_model():
    tokenizer = AutoTokenizer.from_pretrained(
        BASE_MODEL,
        use_fast=False
    )

    # IMPORTANT for LLaMA
    tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        device_map="auto",
        torch_dtype=torch.float16
    )

    model = PeftModel.from_pretrained(
        base_model,
        LORA_PATH
    )

    model.eval()
    return model, tokenizer
