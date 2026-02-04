# utils/gcs.py
import os
from datetime import timedelta
from google.cloud import storage

BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")

client = storage.Client()
bucket = client.bucket(BUCKET_NAME)


def upload_file_to_gcs(
    file_path: str,
    destination_path: str,
    content_type: str | None = None,
) -> str:
    blob = bucket.blob(destination_path)

    blob.upload_from_filename(
        file_path,
        content_type=content_type,
    )

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
