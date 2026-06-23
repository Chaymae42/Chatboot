from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ===== Création d'une conversation =====
class ConversationCreate(BaseModel):
    user_email: str
    title: Optional[str] = "Nouvelle conversation"


# ===== Ajout d'un message =====
class MessageCreate(BaseModel):
    role: str
    text: str


# ===== Lecture d'un message =====
class MessageOut(BaseModel):
    id: int
    role: str
    text: str
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Résumé de conversation (pour la liste de la sidebar) =====
class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Conversation complète avec ses messages =====
class ConversationDetail(ConversationOut):
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True
