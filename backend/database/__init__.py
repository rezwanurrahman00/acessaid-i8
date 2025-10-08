"""
Database package for AccessAid application.
This package contains all database-related modules.
"""

from .database import get_db, create_tables, drop_tables, reset_database
from .models import User, Task, Reminder, Notification, TTSHistory, UserSettings, DeviceSync, AccessibilityLog, MLModel
from .seed_data import seed_database

__all__ = [
    "get_db",
    "create_tables", 
    "drop_tables",
    "reset_database",
    "User",
    "Task", 
    "Reminder",
    "Notification",
    "TTSHistory",
    "UserSettings",
    "DeviceSync",
    "AccessibilityLog",
    "MLModel",
    "seed_database"
]
