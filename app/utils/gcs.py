# utils/gcs.py
import os
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
