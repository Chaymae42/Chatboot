from fastapi import APIRouter

from pydantic import BaseModel
from typing import List, Optional

from rag.rag_service import ask_rag


router = APIRouter()


class Message(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    message: str
    model: str
    history: Optional[List[Message]] = None


@router.post("/rag-chat")
def rag_chat(data: ChatRequest):

    history = [m.dict() for m in data.history] if data.history else []

    result = ask_rag(
        data.message,
        data.model,
        history
    )

    return {
        "question": data.message,
        "response": result["response"],
        "cart_item": result["cart_item"],
    }
