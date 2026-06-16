from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models.user import User
from schemas.user_schema import UserCreate, UserLogin

router = APIRouter()

# Dependency DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    new_user = User(email=user.email, password=user.password)
    db.add(new_user)
    db.commit()
    return {"message": "User created"}

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    
    if not db_user or db_user.password != user.password:
        return {"error": "Invalid credentials"}
    
    return {"message": "Login successful"}