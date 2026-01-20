import os
import time
import psycopg2
import requests
from dotenv import load_dotenv

# --------------------------------------------------
# Load env
# --------------------------------------------------
load_dotenv()

API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

DB_NAME = os.getenv("POSTGRES_DB")
DB_USER = os.getenv("POSTGRES_USER")
DB_PASS = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("POSTGRES_HOST")
DB_PORT = os.getenv("POSTGRES_PORT")

print("DB:", DB_NAME)
print("USER:", DB_USER)
print("HOST:", DB_HOST)
print("PORT:", DB_PORT)

# --------------------------------------------------
# DB connection
# --------------------------------------------------
conn = psycopg2.connect(
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASS,
    host=DB_HOST,
    port=DB_PORT,
)
cur = conn.cursor()

# --------------------------------------------------
# Config
# --------------------------------------------------
BATCH_SIZE = 500        # Safe size
SLEEP_TIME = 0.05       # ~20 requests/sec (safe for Google)
GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

# --------------------------------------------------
# Geocode function
# --------------------------------------------------
def geocode(address: str):
    params = {
        "address": address,
        "key": API_KEY,
    }

    r = requests.get(GEOCODE_URL, params=params, timeout=10)
    data = r.json()

    status = data.get("status")

    if status == "OK":
        loc = data["results"][0]["geometry"]["location"]
        return loc["lat"], loc["lng"]

    if status in ("ZERO_RESULTS", "INVALID_REQUEST"):
        return None, None

    if status in ("OVER_QUERY_LIMIT", "REQUEST_DENIED"):
        raise RuntimeError(f"Google API error: {status}")

    return None, None

# --------------------------------------------------
# Fetch batch (ONLY untouched rows)
# --------------------------------------------------
cur.execute("""
    SELECT id, title, city, state, country_code
    FROM poi
    WHERE latitude IS NULL
      AND geocode_failed = FALSE
    ORDER BY id
    LIMIT %s;
""", (BATCH_SIZE,))

rows = cur.fetchall()
print(f"Found {len(rows)} POIs to geocode")

updated = 0
failed = 0

# --------------------------------------------------
# Process batch
# --------------------------------------------------
for poi_id, title, city, state, country in rows:
    address = ", ".join(filter(None, [title, city, country]))

    try:
        lat, lng = geocode(address)

        if lat is not None and lng is not None:
            cur.execute("""
                UPDATE poi
                SET latitude = %s,
                    longitude = %s
                WHERE id = %s
                  AND latitude IS NULL;
            """, (lat, lng, poi_id))
            updated += 1
        else:
            cur.execute("""
                UPDATE poi
                SET geocode_failed = TRUE
                WHERE id = %s;
            """, (poi_id,))
            failed += 1

        time.sleep(SLEEP_TIME)

    except Exception as e:
        print(f"Error for POI {poi_id}: {e}")
        cur.execute("""
            UPDATE poi
            SET geocode_failed = TRUE
            WHERE id = %s;
        """, (poi_id,))
        failed += 1
        time.sleep(1)

# --------------------------------------------------
# Commit & cleanup
# --------------------------------------------------
conn.commit()

print("Batch completed")
print(f"Updated: {updated}")
print(f"Failed: {failed}")

cur.close()
conn.close()
