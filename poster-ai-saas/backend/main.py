from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from celery_worker import celery_app, generate_poster_task

app = FastAPI(title="AI Poster Generator API")

# تفعيل CORS بالكامل ليسمح لـ Next.js بالاتصال
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    prompt: str

@app.get("/")
def read_root():
    return {"status": "online"}

@app.post("/api/v1/generate")
async def generate_poster(req: GenerateRequest):
    # إرسال المهمة لـ Celery
    task = generate_poster_task.delay(req.prompt)
    return {
        "status": "queued",
        "task_id": task.id,
        "prompt": req.prompt
    }

@app.get("/api/v1/tasks/{task_id}")
async def get_task_status(task_id: str):
    task_result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task_result.status,
        "result": task_result.result if task_result.ready() else None
    }