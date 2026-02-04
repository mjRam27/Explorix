# utils/db_redis.py
import redis
import json
from uuid import UUID
from datetime import datetime

# Connect to local Redis server
redis_client = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)

def cache_departure(key, value, ttl=300):  # default TTL 5 min
    redis_client.set(key, json.dumps(value), ex=ttl)

def get_cached_departure(key):
    val = redis_client.get(key)
    return json.loads(val) if val else None


def _to_serializable(value):
    if isinstance(value, dict):
        return {str(k): _to_serializable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_serializable(v) for v in value]
    if isinstance(value, tuple):
        return [_to_serializable(v) for v in value]
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def cache_json(key, value, ttl=60):
    safe_value = _to_serializable(value)
    redis_client.set(key, json.dumps(safe_value), ex=ttl)


def get_cached_json(key):
    val = redis_client.get(key)
    return json.loads(val) if val else None


def delete_keys_by_prefix(prefix: str):
    pattern = f"{prefix}*"
    keys = list(redis_client.scan_iter(match=pattern))
    if keys:
        redis_client.delete(*keys)
