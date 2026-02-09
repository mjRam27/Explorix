# utils/gcs.py
import os
import time
from datetime import timedelta
from google.cloud import storage
from google.auth.exceptions import TransportError
from requests.exceptions import ConnectionError as RequestsConnectionError, Timeout as RequestsTimeout

BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")

client = storage.Client()
bucket = client.bucket(BUCKET_NAME)


def upload_file_to_gcs(
    file_path: str,
    destination_path: str,
    content_type: str | None = None,
    max_attempts: int = 3,
) -> str:
    blob = bucket.blob(destination_path)
    last_exc: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            blob.upload_from_filename(
                file_path,
                content_type=content_type,
            )
            break
        except (TransportError, RequestsConnectionError, RequestsTimeout) as exc:
            last_exc = exc
            if attempt >= max_attempts:
                raise RuntimeError("GCS upload failed after retries") from exc
            # Backoff: 0.7s, 1.4s, ...
            time.sleep(0.7 * attempt)
        except Exception as exc:
            # Non-transient or unknown error path.
            raise RuntimeError("GCS upload failed") from exc
    # Public URL (even if bucket is private, usable via signed or backend)
    return blob.public_url


def get_public_url(destination_path: str) -> str:
    blob = bucket.blob(destination_path)
    return blob.public_url


def get_signed_url(destination_path: str, minutes: int = 60) -> str:
    blob = bucket.blob(destination_path)
    try:
        return blob.generate_signed_url(
            expiration=timedelta(minutes=minutes),
            method="GET",
        )
    except Exception:
        return blob.public_url
