# itinerary/prompts.py
def build_itinerary_prompt(req, duration: int) -> str:
    return f"""
Create a {duration}-day travel itinerary for {req.destination}.

PACE RULES:
- slow: 2–3 places per day
- moderate: 3–4 places per day
- fast: 5–6 places per day

RULES:
- Use ONLY places from the provided context
- Return ONLY valid JSON
- Respect pace: {req.pace}
- Balance days realistically

JSON FORMAT:
{{
  "title": "Trip title",
  "description": "Short overview",
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "places": [
        {{
          "place_id": "uuid",
          "order": 1,
          "duration_minutes": 120,
          "notes": "Tips"
        }}
      ]
    }}
  ],
  "tags": ["culture", "food"]
}}
"""
