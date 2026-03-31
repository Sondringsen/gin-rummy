from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.auth.schema import UserCreate, Token, LoginRequest
import backend.auth.service as svc

router = APIRouter()


@router.post("/register", response_model=Token, status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        user = svc.create_user(db, user_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    token = svc.create_access_token(str(user.id), user.username)
    return Token(access_token=token, token_type="bearer")


@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = svc.authenticate_user(db, req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = svc.create_access_token(str(user.id), user.username)
    return Token(access_token=token, token_type="bearer")
