# utils/translation.py
from typing import Tuple
from pathlib import Path
from google.oauth2 import service_account

# =========================
# 🔒 SINGLE DEMO TOGGLE
# =========================
ENABLE_TRANSLATION = True   # <-- ONLY toggle this for demo

# =========================
# CONFIG
# =========================
PROJECT_ID = "explorix032527"
LOCATION = "global"

# 🔥 ABSOLUTE, SAFE PATH
BASE_DIR = Path(__file__).resolve().parent.parent
SERVICE_ACCOUNT_FILE = BASE_DIR / "secrets" / "gcp-service-account.json"

_client = None


def _get_client():
    """
    Lazily create Google Translate client.
    Will NOT crash app startup.
    """
    global _client

    if not ENABLE_TRANSLATION:
        return None

    if _client is None:
        if not SERVICE_ACCOUNT_FILE.exists():
            raise RuntimeError(
                f"Google service account file not found at: {SERVICE_ACCOUNT_FILE}"
            )

        from google.cloud import translate_v3 as translate

        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE
        )

        _client = translate.TranslationServiceClient(
            credentials=credentials
        )

    return _client


def maybe_translate_to_english(text: str) -> Tuple[str, str]:
    """
    Returns:
      (text_for_model, detected_language)
    """

    if not ENABLE_TRANSLATION:
        return text, "unknown"

    client = _get_client()

    response = client.detect_language(
        parent=f"projects/{PROJECT_ID}/locations/{LOCATION}",
        content=text,
        mime_type="text/plain",
    )

    lang = response.languages[0].language_code

    print(f"[TRANSLATION] Detected language: {lang}")

    if lang == "en":
        return text, lang

    translated = client.translate_text(
        parent=f"projects/{PROJECT_ID}/locations/{LOCATION}",
        contents=[text],
        mime_type="text/plain",
        source_language_code=lang,
        target_language_code="en",
    )

    return translated.translations[0].translated_text, lang


def translate_back(text: str, target_lang: str) -> str:
    if not ENABLE_TRANSLATION or target_lang in ("en", "unknown"):
        return text

    client = _get_client()

    response = client.translate_text(
        parent=f"projects/{PROJECT_ID}/locations/{LOCATION}",
        contents=[text],
        mime_type="text/plain",
        source_language_code="en",
        target_language_code=target_lang,
    )

    return response.translations[0].translated_text
