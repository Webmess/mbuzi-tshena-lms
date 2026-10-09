from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ChatbotInteraction
from app.auth import get_current_user, get_current_admin
from app.utils.chatbot import reply, QUICK_REPLIES
from app.utils.risk_score import relative_date

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])


class ChatMessage(BaseModel):
    message: str = Field(min_length=1, max_length=500)

def interaction_to_dict(c: ChatbotInteraction) -> dict:
    return {
        "id": c.id,
        "question": c.query_text,
        "answer": c.response_text,
        "category": c.query_category,
        "status": c.interaction_status,
        "escalated": c.escalation_flag,
        "user_name": c.user.full_name if c.user else "",
        "user_email": c.user.email if c.user else "",
        "asked": relative_date(c.created_at),
    }

# Customer sends a question, gets an answer; every interaction is stored (SRS REQ-28, 29, 30, 31)
@router.post("/message")
def send_message(
    data: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = reply(data.message, current_user, db)
    chat = ChatbotInteraction(
        user_id=current_user.id,
        query_text=data.message,
        response_text=result["reply"],
        query_category=result["category"],
        interaction_status=result["status"],
        escalation_flag=result["escalated"],
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return {**interaction_to_dict(chat), "quick_replies": QUICK_REPLIES}

# Customer's own recent conversation, shown when the chat window opens
@router.get("/history")
def my_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(ChatbotInteraction)
        .filter(ChatbotInteraction.user_id == current_user.id)
        .order_by(ChatbotInteraction.created_at.desc())
        .limit(20)
        .all()
    )
    return [interaction_to_dict(c) for c in reversed(rows)]

# Admin: questions the bot could not answer or where the customer asked for a person
@router.get("/escalated")
def escalated_questions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    rows = (
        db.query(ChatbotInteraction)
        .filter(ChatbotInteraction.escalation_flag == True)  # noqa: E712
        .order_by(ChatbotInteraction.created_at.desc())
        .all()
    )
    return [interaction_to_dict(c) for c in rows]

