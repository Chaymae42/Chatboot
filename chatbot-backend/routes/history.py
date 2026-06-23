from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.conversation import Conversation, Message
from schemas.conversation_schema import (
    ConversationCreate,
    MessageCreate,
    ConversationOut,
    ConversationDetail,
)

router = APIRouter()


# Dependency DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===== Créer une conversation =====
@router.post("/conversations", response_model=ConversationOut)
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db)):
    conversation = Conversation(
        user_email=data.user_email,
        title=data.title or "Nouvelle conversation",
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


# ===== Lister les conversations d'un utilisateur =====
@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(email: str, db: Session = Depends(get_db)):
    return (
        db.query(Conversation)
        .filter(Conversation.user_email == email)
        .order_by(Conversation.id.desc())
        .all()
    )


# ===== Charger une conversation et ses messages =====
@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    return conversation


# ===== Ajouter un message à une conversation =====
@router.post("/conversations/{conversation_id}/messages")
def add_message(
    conversation_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation introuvable")

    # Si c'est le tout premier message du client, on en fait le titre
    if data.role == "user":
        existing = (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .count()
        )
        if existing == 0:
            conversation.title = data.text[:50]

    message = Message(
        conversation_id=conversation_id,
        role=data.role,
        text=data.text,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return {"id": message.id, "message": "Message enregistré"}


# ===== Supprimer une conversation =====
@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation introuvable")

    db.delete(conversation)
    db.commit()
    return {"message": "Conversation supprimée"}
