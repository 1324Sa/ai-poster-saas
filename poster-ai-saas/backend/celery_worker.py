import os
import ssl
from pathlib import Path
from celery import Celery
from dotenv import load_dotenv

# تحديد المسار المطلق لملف .env لضمان تحميلة بشكل صحيح
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

BROKER_URL = os.getenv("CELERY_BROKER_URL")
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND")

if not BROKER_URL:
    raise ValueError("لم يتم العثور على CELERY_BROKER_URL! تأكد من وجود ملف .env داخل مجلد backend وأن المتغير مكتوب داخله بشكل صحيح.")

celery_app = Celery(
    "poster_tasks",
    broker=BROKER_URL,
    backend=RESULT_BACKEND
)

# تطبيق إعدادات SSL لتفادي قيود الشهادات مع Upstash
celery_app.conf.update(
    broker_use_ssl={'ssl_cert_reqs': ssl.CERT_NONE},
    redis_backend_use_ssl={'ssl_cert_reqs': ssl.CERT_NONE},
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
)

@celery_app.task(name="generate_poster_task")
def generate_poster_task(prompt: str):
    import time
    time.sleep(3) 
    return {
        "status": "completed",
        "image_url": "https://picsum.photos/500/600"
    }