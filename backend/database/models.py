"""
Database models for AccessAid application.
This module defines the SQLAlchemy models for the assistive technology app.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    """User model - Core entity that stores main user information."""
    __tablename__ = "users"
    
    # Primary key
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Login information
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Personal information
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    
    # Accessibility preferences (JSON field for flexible customization)
    accessibility_preferences = Column(JSON, default={
        "voice_speed": 1.0,
        "high_contrast": False,
        "large_text": False,
        "voice_navigation": True,
        "reminder_frequency": "normal",
        "preferred_voice": "default"
    })
    
    # System fields
    timezone = Column(String(50), default="UTC")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    tts_history = relationship("TTSHistory", back_populates="user", cascade="all, delete-orphan")
    user_settings = relationship("UserSettings", back_populates="user", cascade="all, delete-orphan")
    device_sync = relationship("DeviceSync", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    accessibility_logs = relationship("AccessibilityLog", back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    """Task model for managing user tasks and activities."""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    status = Column(String(20), default="pending")  # pending, in_progress, completed, cancelled
    category = Column(String(50))  # work, personal, health, etc.
    due_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Accessibility features
    has_voice_reminder = Column(Boolean, default=True)
    reminder_text = Column(Text)  # Custom text for TTS reminder
    
    # Relationships
    user = relationship("User", back_populates="tasks")


class Reminder(Base):
    """Reminder model - Stores all reminders that a user creates."""
    __tablename__ = "reminders"
    
    # Primary key
    reminder_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign key to User
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    # Reminder details
    title = Column(String(200), nullable=False)
    description = Column(Text)
    reminder_datetime = Column(DateTime, nullable=False)
    frequency = Column(String(50), default="once")  # once, daily, weekly, monthly, custom
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    
    # Status fields
    is_active = Column(Boolean, default=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="reminders")
    notifications = relationship("Notification", back_populates="reminder", cascade="all, delete-orphan")


class AccessibilityLog(Base):
    """Log model for tracking accessibility feature usage and user behavior."""
    __tablename__ = "accessibility_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    feature_used = Column(String(50), nullable=False)  # tts, voice_nav, high_contrast, etc.
    action = Column(String(100), nullable=False)  # specific action taken
    timestamp = Column(DateTime, default=datetime.utcnow)
    session_id = Column(String(100))  # To group related actions
    context_data = Column(JSON)  # Additional context data
    
    # Relationships
    user = relationship("User", back_populates="accessibility_logs")


class Notification(Base):
    """Notification model - Tracks all alerts or messages sent for reminders."""
    __tablename__ = "notifications"
    
    # Primary key
    notification_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign keys
    reminder_id = Column(Integer, ForeignKey("reminders.reminder_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    # Notification details
    notification_type = Column(String(50), nullable=False)  # SMS, email, voice, push
    message = Column(Text, nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    sent_time = Column(DateTime)
    
    # Status fields
    status = Column(String(20), default="pending")  # pending, sent, failed, cancelled
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    reminder = relationship("Reminder", back_populates="notifications")
    user = relationship("User", back_populates="notifications")


class TTSHistory(Base):
    """TTS History - Keeps record of all text-to-speech conversions made by the user."""
    __tablename__ = "tts_history"
    
    # Primary key
    tts_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign key to User
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    # TTS details
    content = Column(Text, nullable=False)  # The text spoken
    voice_settings = Column(JSON, default={})  # Voice configuration used
    speech_rate = Column(Float, default=1.0)
    volume = Column(Float, default=1.0)
    
    # Additional tracking
    duration_seconds = Column(Float)  # How long the TTS took
    timestamp = Column(DateTime, default=datetime.utcnow)
    context = Column(String(100))  # Where TTS was used (reminder, task, etc.)
    
    # Relationships
    user = relationship("User", back_populates="tts_history")


class UserSettings(Base):
    """User Settings - Stores custom app settings for each user."""
    __tablename__ = "user_settings"
    
    # Primary key
    setting_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign key to User
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    # Setting details
    setting_name = Column(String(100), nullable=False)  # e.g., "notification_sound", "dark_mode"
    setting_value = Column(Text, nullable=False)  # The actual setting value
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="user_settings")


class DeviceSync(Base):
    """Device Sync - Manages user devices and data syncing."""
    __tablename__ = "device_sync"
    
    # Primary key
    sync_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign key to User
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    # Device and sync details
    device_identifier = Column(String(100), nullable=False)  # Unique device identifier
    last_sync = Column(DateTime, default=datetime.utcnow)
    sync_status = Column(String(20), default="active")  # active, inactive, error, pending
    sync_data = Column(JSON, default={})  # May hold logs or JSON data
    
    # Additional tracking
    device_name = Column(String(100))  # User-friendly device name
    device_type = Column(String(50))  # mobile, tablet, desktop
    platform = Column(String(50))  # ios, android, web
    app_version = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="device_sync")


class MLModel(Base):
    """Model for storing ML model information and user learning data."""
    __tablename__ = "ml_models"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_name = Column(String(100), nullable=False)
    model_type = Column(String(50), nullable=False)  # reminder_priority, task_suggestion, etc.
    version = Column(String(20), default="1.0")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_trained = Column(DateTime)
    accuracy_score = Column(Float)
    model_data = Column(JSON)  # Serialized model parameters
