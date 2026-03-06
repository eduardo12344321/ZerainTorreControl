from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.hash import pbkdf2_sha256
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from config import SECRET_KEY, ALGORITHM

# --- AUTH MODELS ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user_data: dict

class DriverLogin(BaseModel):
    dni: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class GoogleLogin(BaseModel):
    token: str

class DoubleLogin(BaseModel):
    google_token: str
    password: str

class AttendanceOverride(BaseModel):
    driver_id: int
    date: str
    regular_hours: Optional[float] = None
    overtime_hours: Optional[float] = None
    diet_count: Optional[int] = None
    status: Optional[str] = "MODIFIED" # PENDING, APPROVED, REJECTED, MODIFIED
    admin_comment: Optional[str] = None

class ExpenseSubmission(BaseModel):
    driver_id: int
    date: str
    amount: float
    type: str  # DIET, FUEL, PARKING, OTHER
    description: Optional[str] = None
    ticket_url: Optional[str] = None

class DriverLeave(BaseModel):
    driver_id: int
    type: str  # SICK, PERMISSION_PAID, PERMISSION_UNPAID
    start_date: str
    end_date: str
    reason: Optional[str] = None

# --- AUTH UTILS ---

def verify_password(plain_password, hashed_password):
    return pbkdf2_sha256.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pbkdf2_sha256.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/admin/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        user_id = payload.get("id")
        if username is None:
            raise credentials_exception
        return {"username": username, "role": role, "id": user_id}
    except JWTError:
        raise credentials_exception

async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["ADMIN", "SUPER_ADMIN", "DISPATCHER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user
