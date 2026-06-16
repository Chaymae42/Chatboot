from fastapi import APIRouter
from pydantic import BaseModel
from services.llm_service import ask_llama, ask_phi
from services.deepseek_service import ask_deepseek

router = APIRouter()

# ===== Request Schema =====
class ChatRequest(BaseModel):
    message: str
    model: str  # "local" ou "deepseek"

# ===== Endpoint =====
@router.post("/chat")
def chat(req: ChatRequest):

    if not req.message:
        return {"error": "Message vide"}

    try:
        # 🔹 Choix du modèle
        if req.model == "local":
            response = ask_llama(req.message)

        elif req.model == "deepseek":
            response = ask_deepseek(req.message)

        elif req.model == "phi3":
            response = ask_phi(req.message)

        else:
            return {"error": "Model non supporté"}

        return {
            "model": req.model,
            "question": req.message,
            "response": response
        }

    except Exception as e:
        return {
            "error": str(e)
        }