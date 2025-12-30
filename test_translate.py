import os
from dotenv import load_dotenv
import boto3

load_dotenv()

translate = boto3.client(
    "translate",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION"),
)

result = translate.translate_text(
    Text="Guten Morgen, wie geht es dir?",
    SourceLanguageCode="auto",
    TargetLanguageCode="en"
)

print(result["TranslatedText"])
