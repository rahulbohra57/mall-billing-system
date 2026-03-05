from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from passlib.context import CryptContext
from app.database import supabase
from app.auth_utils import create_access_token
import uuid

router = APIRouter(prefix="/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    res = (
        supabase.table("app_users")
        .select("*")
        .eq("email", form_data.username)
        .single()
        .execute()
    )
    user = res.data
    if not user or not pwd_context.verify(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": user["id"],
        "role": user["role"],
        "email": user["email"],
        "name": user["name"]
    })
    return {"access_token": token, "token_type": "bearer", "role": user["role"], "name": user["name"], "id": user["id"]}


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "cashier"


@router.post("/register")
def register(body: RegisterRequest):
    if body.role not in ("manager", "cashier"):
        raise HTTPException(status_code=400, detail="Role must be 'manager' or 'cashier'")

    existing = supabase.table("app_users").select("id").eq("email", body.email).execute().data
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = pwd_context.hash(body.password)
    res = supabase.table("app_users").insert({
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email,
        "password_hash": hashed,
        "role": body.role
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Registration failed")

    return {"message": "User registered successfully"}
