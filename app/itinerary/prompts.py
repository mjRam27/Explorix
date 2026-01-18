# app/itinerary/prompts.py

def build_itinerary_prompt(req, duration: int) -> str:
    return f"""
You MUST return ONLY valid JSON.
No text before or after JSON.
No explanations.
No markdown.

Create a {duration}-day travel itinerary for {req.destination}.

PACE RULES:
- slow: 2–3 places per day
- moderate: 3–4 places per day
- fast: 5–6 places per day

RULES:
- Use ONLY places from the provided CONTEXT
- Do NOT invent place IDs
- Keep days realistic
- Respect pace: {req.pace}

JSON FORMAT (STRICT):
{{
  "title": "Trip title",
  "description": "Short overview",
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "places": [
        {{
          "place_id": 123,
          "order": 1,
          "duration_minutes": 120,
          "notes": "Optional tips"
        }}
      ]
    }}
  ],
  "tags": ["culture", "food"]
}}
"""
