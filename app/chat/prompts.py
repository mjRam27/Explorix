def build_chat_itinerary_prompt(
    destination: str,
    start_date: str,
    duration: int,
    pace: str
) -> str:
    return f"""
You are Explorix AI, a professional travel planner.

TASK:
Create a {duration}-day travel itinerary for {destination},
starting from {start_date}.

PACE RULES:
- slow: 2–3 places per day
- moderate: 3–4 places per day
- fast: 5–6 places per day
Selected pace: {pace}

STRICT RULES (MANDATORY):
- Use ONLY places provided in the context
- Do NOT invent place IDs
- Do NOT add explanations or text outside JSON
- Return ONLY valid JSON
- Place order must start from 1 and be sequential
- Dates must be realistic and increasing by 1 day

JSON FORMAT (MUST MATCH EXACTLY):
{{
  "title": "Short itinerary title",
  "description": "1–2 line overview",
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Day theme (optional)",
      "places": [
        {{
          "place_id": 123,
          "order": 1,
          "duration_minutes": 90,
          "notes": "Short practical tip"
        }}
      ],
      "notes": "Optional day note"
    }}
  ],
  "tags": ["culture", "food"]
}}
"""
