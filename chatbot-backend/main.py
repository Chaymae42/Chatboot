from fastapi import FastAPI
from database import engine, Base
from routes import auth
from routes import chat
from routes import rag_chat
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# créer tables
Base.metadata.create_all(bind=engine)

# inclure routes
app.include_router(auth.router)

app.include_router(chat.router)

app.include_router(rag_chat.router)