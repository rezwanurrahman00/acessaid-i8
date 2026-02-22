"""
FastAPI main application for AccessAid backend.
This module provides REST API endpoints for the AccessAid mobile app.
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, EmailStr
import uvicorn
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
from dotenv import load_dotenv

load_dotenv()

from database import get_db, create_tables
from database.models import User, Task, Reminder, Notification, TTSHistory, UserSettings, DeviceSync
from database.seed_data import seed_database

# Password hashing context for bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-change-in-production-12345")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))

# Pydantic models for request/response validation
class UserRegistration(BaseModel):
    email: EmailStr
    pin: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    pin: str

class UserResponse(BaseModel):
    user_id: int
    email: str
    name: str
    first_name: str
    last_name: str
    accessibility_preferences: dict
    timezone: str
    is_active: bool
    created_at: Optional[str]

    class Config:
        from_attributes = True

class UserResponseWithToken(UserResponse):
    access_token: str
    token_type: str = "bearer"

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_datetime: Optional[str] = None
    frequency: Optional[str] = None
    priority: Optional[str] = None
    is_active: Optional[bool] = None
    is_completed: Optional[bool] = None

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    reminder_datetime: Optional[str] = None
    frequency: str = "once"
    priority: str = "medium"

# Create FastAPI app
app = FastAPI(
    title="AccessAid API",
    description="Backend API for AccessAid accessibility app",
    version="1.0.0"
)

# Add CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your app's origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database and create tables on startup."""
    create_tables()
    print("Database tables created successfully!")

# Health check endpoint
@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "AccessAid API is running!", "status": "healthy"}

@app.get("/api/health/database")
async def database_health_check(db: Session = Depends(get_db)):
    """Check database connection and table status."""
    try:
        # Test database connection
        user_count = db.query(User).count()
        reminder_count = db.query(Reminder).count()
        
        return {
            "database_connection": "Connected",
            "tables": {
                "users": user_count,
                "reminders": reminder_count
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "database_connection": f"Error: {str(e)}",
            "error_type": type(e).__name__,
            "timestamp": datetime.utcnow().isoformat()
        }

# Helper functions for PIN hashing and verification
def hash_pin(pin: str) -> str:
    """Hash a PIN using bcrypt."""
    return pwd_context.hash(pin)

def verify_pin(pin: str, hashed_pin: str) -> bool:
    """Verify a PIN against its bcrypt hash."""
    return pwd_context.verify(pin, hashed_pin)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Authentication endpoints
@app.post("/api/auth/register", response_model=UserResponseWithToken)
async def register_user(user_data: UserRegistration, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate PIN format (4 digits)
    if not user_data.pin.isdigit() or len(user_data.pin) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN must be exactly 4 digits"
        )
    
    # Split name into first and last name
    name_parts = user_data.name.strip().split(maxsplit=1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    
    # Create new user with hashed PIN
    new_user = User(
        email=user_data.email.lower(),
        password_hash=hash_pin(user_data.pin),
        first_name=first_name,
        last_name=last_name,
        accessibility_preferences={
            "voice_speed": 1.0,
            "high_contrast": False,
            "large_text": False,
            "voice_navigation": True,
            "reminder_frequency": "normal",
            "preferred_voice": "default"
        },
        timezone="UTC",
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create JWT token
    access_token = create_access_token(data={"sub": str(new_user.user_id), "email": new_user.email})
    
    return UserResponseWithToken(
        user_id=new_user.user_id,
        email=new_user.email,
        name=f"{new_user.first_name} {new_user.last_name}".strip(),
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        accessibility_preferences=new_user.accessibility_preferences,
        timezone=new_user.timezone,
        is_active=new_user.is_active,
        created_at=new_user.created_at.isoformat() if new_user.created_at else None,
        access_token=access_token
    )

@app.post("/api/auth/login", response_model=UserResponseWithToken)
async def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login a user with email and PIN."""
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or PIN"
        )
    
    # Verify PIN
    if not verify_pin(login_data.pin, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or PIN"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    # Create JWT token
    access_token = create_access_token(data={"sub": str(user.user_id), "email": user.email})
    
    
    return UserResponseWithToken(
        user_id=user.user_id,
        email=user.email,
        name=f"{user.first_name} {user.last_name}".strip(),
        first_name=user.first_name,
        last_name=user.last_name,
        accessibility_preferences=user.accessibility_preferences,
        timezone=user.timezone,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else None,
        access_token=access_token
    )

# User endpoints
@app.get("/api/users", response_model=List[dict])
async def get_users(db: Session = Depends(get_db)):
    """Get all users."""
    users = db.query(User).all()
    return [
        {
            "user_id": user.user_id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "accessibility_preferences": user.accessibility_preferences,
            "timezone": user.timezone,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
        for user in users
    ]

@app.get("/api/users/{user_id}", response_model=dict)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user by ID."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "accessibility_preferences": user.accessibility_preferences,
        "timezone": user.timezone,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

# Reminder endpoints
@app.get("/api/users/{user_id}/reminders", response_model=List[dict])
async def get_user_reminders(user_id: int, db: Session = Depends(get_db)):
    """Get all reminders for a specific user."""
    reminders = db.query(Reminder).filter(Reminder.user_id == user_id).all()
    return [
        {
            "reminder_id": reminder.reminder_id,
            "title": reminder.title,
            "description": reminder.description,
            "reminder_datetime": reminder.reminder_datetime.isoformat() if reminder.reminder_datetime else None,
            "frequency": reminder.frequency,
            "priority": reminder.priority,
            "is_active": reminder.is_active,
            "is_completed": reminder.is_completed,
            "created_at": reminder.created_at.isoformat() if reminder.created_at else None,
        }
        for reminder in reminders
    ]

@app.post("/api/users/{user_id}/reminders", response_model=dict)
async def create_reminder(
    user_id: int,
    reminder_data: ReminderCreate,
    db: Session = Depends(get_db)
):
    """Create a new reminder for a user."""
    try:
        # Check if user exists first
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Parse datetime if provided
        parsed_datetime = None
        if reminder_data.reminder_datetime:
            try:
                parsed_datetime = datetime.fromisoformat(reminder_data.reminder_datetime.replace('Z', '+00:00'))
            except ValueError as e:
                raise HTTPException(status_code=400, detail="Invalid datetime format")
        else:
            parsed_datetime = datetime.utcnow() + timedelta(hours=1)
        
        reminder = Reminder(
            user_id=user_id,
            title=reminder_data.title,
            description=reminder_data.description,
            reminder_datetime=parsed_datetime,
            frequency=reminder_data.frequency,
            priority=reminder_data.priority,
            is_active=True,
            is_completed=False
        )
        
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        
        return {
            "reminder_id": reminder.reminder_id,
            "title": reminder.title,
            "description": reminder.description,
            "reminder_datetime": reminder.reminder_datetime.isoformat(),
            "frequency": reminder.frequency,
            "priority": reminder.priority,
            "is_active": reminder.is_active,
            "is_completed": reminder.is_completed,
            "created_at": reminder.created_at.isoformat() if reminder.created_at else None,
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (like user not found)
        raise
    except Exception as e:
        # Import traceback for more detailed error info
        import traceback
        print('❌ Full traceback:')
        traceback.print_exc()
        
        # Rollback the transaction explicitly
        db.rollback()
        print('🔄 Transaction rolled back explicitly')
        
        # Raise a proper HTTP exception
        raise HTTPException(
            status_code=500, 
            detail=f"Error creating reminder: {type(e).__name__}: {str(e)}"
        )

@app.put("/api/reminders/{reminder_id}", response_model=dict)
async def update_reminder(
    reminder_id: int,
    update_data: ReminderUpdate,
    db: Session = Depends(get_db)
):
    """Update a reminder."""
    # Find the reminder
    reminder = db.query(Reminder).filter(Reminder.reminder_id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    # Update fields if provided
    if update_data.title is not None:
        reminder.title = update_data.title
    if update_data.description is not None:
        reminder.description = update_data.description
    if update_data.reminder_datetime is not None:
        try:
            reminder.reminder_datetime = datetime.fromisoformat(update_data.reminder_datetime.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format")
    if update_data.frequency is not None:
        reminder.frequency = update_data.frequency
    if update_data.priority is not None:
        reminder.priority = update_data.priority
    if update_data.is_active is not None:
        reminder.is_active = update_data.is_active
    if update_data.is_completed is not None:
        reminder.is_completed = update_data.is_completed
    
    db.commit()
    db.refresh(reminder)
    
    return {
        "reminder_id": reminder.reminder_id,
        "title": reminder.title,
        "description": reminder.description,
        "reminder_datetime": reminder.reminder_datetime.isoformat() if reminder.reminder_datetime else None,
        "frequency": reminder.frequency,
        "priority": reminder.priority,
        "is_active": reminder.is_active,
        "is_completed": reminder.is_completed,
        "created_at": reminder.created_at.isoformat() if reminder.created_at else None,
    }

@app.delete("/api/reminders/{reminder_id}")
async def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Delete a reminder."""
    reminder = db.query(Reminder).filter(Reminder.reminder_id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    db.delete(reminder)
    db.commit()
    
    return {"message": "Reminder deleted successfully"}

# TTS History endpoints
@app.post("/api/users/{user_id}/tts-history")
async def log_tts_usage(
    user_id: int,
    content: str,
    voice_settings: Optional[dict] = None,
    speech_rate: float = 1.0,
    volume: float = 1.0,
    context: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Log TTS usage for analytics."""
    tts_entry = TTSHistory(
        user_id=user_id,
        content=content,
        voice_settings=voice_settings or {},
        speech_rate=speech_rate,
        volume=volume,
        context=context or "app_usage"
    )
    
    db.add(tts_entry)
    db.commit()
    
    return {"message": "TTS usage logged successfully"}

@app.get("/api/users/{user_id}/tts-history", response_model=List[dict])
async def get_tts_history(user_id: int, limit: int = 10, db: Session = Depends(get_db)):
    """Get TTS history for a user."""
    tts_entries = db.query(TTSHistory).filter(TTSHistory.user_id == user_id).order_by(TTSHistory.timestamp.desc()).limit(limit).all()
    
    return [
        {
            "tts_id": entry.tts_id,
            "content": entry.content,
            "voice_settings": entry.voice_settings,
            "speech_rate": entry.speech_rate,
            "volume": entry.volume,
            "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
            "context": entry.context,
        }
        for entry in tts_entries
    ]

# User Settings endpoints
@app.get("/api/users/{user_id}/settings", response_model=List[dict])
async def get_user_settings(user_id: int, db: Session = Depends(get_db)):
    """Get all settings for a user."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).all()
    
    return [
        {
            "setting_id": setting.setting_id,
            "setting_name": setting.setting_name,
            "setting_value": setting.setting_value,
            "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
        }
        for setting in settings
    ]

@app.post("/api/users/{user_id}/settings")
async def update_user_setting(
    user_id: int,
    setting_name: str,
    setting_value: str,
    db: Session = Depends(get_db)
):
    """Update or create a user setting."""
    # Check if setting exists
    existing_setting = db.query(UserSettings).filter(
        UserSettings.user_id == user_id,
        UserSettings.setting_name == setting_name
    ).first()
    
    if existing_setting:
        existing_setting.setting_value = setting_value
        existing_setting.updated_at = datetime.utcnow()
    else:
        new_setting = UserSettings(
            user_id=user_id,
            setting_name=setting_name,
            setting_value=setting_value
        )
        db.add(new_setting)
    
    db.commit()
    
    return {"message": "Setting updated successfully"}

# Seed data endpoint (for development)
@app.post("/api/seed-data")
async def seed_database_endpoint(db: Session = Depends(get_db)):
    """Seed the database with sample data (development only)."""
    try:
        seed_database()
        return {"message": "Database seeded successfully with sample data"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error seeding database: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
