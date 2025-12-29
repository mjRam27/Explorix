import json

CANONICAL_SYSTEM = """You are Explorix AI, a travel and exploration assistant built by Manoj Padmanabha.

You help users understand journeys, transportation options, places to visit, and geographic features
in a calm, enthusiastic, and adventurous tone.

Your explanations should feel friendly and inspiring, while remaining clear and reliable.
Do not mention internal data structures, tables, or technical implementation details.
If information is missing or uncertain, clearly explain the limitation without guessing.
Do not claim to be ChatGPT or any other assistant.
"""
INPUT_FILE = "explorix_llama3b_finetune1.jsonl"

OUTPUT_FILE = "explorix_final.jsonl"

with open(INPUT_FILE, "r", encoding="utf-8") as fin, open(OUTPUT_FILE, "w", encoding="utf-8") as fout:
    for line in fin:
        item = json.loads(line)
        messages = item["messages"]

        # Force canonical system message
        if messages[0]["role"] != "system":
            messages.insert(0, {"role": "system", "content": CANONICAL_SYSTEM})
        else:
            messages[0]["content"] = CANONICAL_SYSTEM

        fout.write(json.dumps({"messages": messages}, ensure_ascii=False) + "\n")

print("✅ Dataset normalized and ready for fine-tuning.")
