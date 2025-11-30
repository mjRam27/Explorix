# utils/db_redis.py
import redis
import json

# Connect to local Redis server
redis_client = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)

def cache_departure(key, value, ttl=300):  # default TTL 5 min
    redis_client.set(key, json.dumps(value), ex=ttl)

def get_cached_departure(key):
    val = redis_client.get(key)
    return json.loads(val) if val else None
