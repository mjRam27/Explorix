import re
import json


def extract_json(text: str) -> dict:
    """
    Extract the first valid JSON object from LLM output.

    Handles cases where the model returns:
    - Explanatory text before/after JSON
    - Markdown ```json blocks
    - Newlines or extra whitespace
    """

    # Remove markdown fences if present
    cleaned = text.replace("```json", "").replace("```", "").strip()

    # Find first JSON object
    match = re.search(r"\{[\s\S]*\}", cleaned)

    if not match:
        raise ValueError("No JSON object found in LLM output")

    return json.loads(match.group(0))
