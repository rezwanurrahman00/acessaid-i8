"""
FastAPI main application for AccessAid backend.
This module provides REST API endpoints for the AccessAid mobile app.
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import uvicorn

from database import get_db, create_tables
from database.models import User, Task, Reminder, Notification, TTSHistory, UserSettings, DeviceSync
from database.seed_data import seed_database

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
    print("✅ Database tables created successfully!")

# Health check endpoint
@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "AccessAid API is running!", "status": "healthy"}

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
    title: str,
    description: Optional[str] = None,
    reminder_datetime: Optional[str] = None,
    frequency: str = "once",
    priority: str = "medium",
    db: Session = Depends(get_db)
):
    """Create a new reminder for a user."""
    # Parse datetime if provided
    parsed_datetime = None
    if reminder_datetime:
        try:
            parsed_datetime = datetime.fromisoformat(reminder_datetime.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format")
    
    reminder = Reminder(
        user_id=user_id,
        title=title,
        description=description,
        reminder_datetime=parsed_datetime or datetime.utcnow() + timedelta(hours=1),
        frequency=frequency,
        priority=priority,
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
    }

@app.put("/api/reminders/{reminder_id}", response_model=dict)
async def update_reminder(
    reminder_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_completed: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Update a reminder."""
    reminder = db.query(Reminder).filter(Reminder.reminder_id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    if title is not None:
        reminder.title = title
    if description is not None:
        reminder.description = description
    if is_active is not None:
        reminder.is_active = is_active
    if is_completed is not None:
        reminder.is_completed = is_completed
        if is_completed:
            reminder.completed_at = datetime.utcnow()
    
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
