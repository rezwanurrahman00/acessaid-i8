"""
Seed data for AccessAid database.
This module provides sample data for development and testing.
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .models import User, Task, Reminder, Notification, TTSHistory, UserSettings, DeviceSync, AccessibilityLog
from .database import SessionLocal


def create_sample_users(db: Session):
    """Create sample users with different accessibility needs."""
    
    # User with vision difficulties
    user1 = User(
        email="john@example.com",
        password_hash="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K8K8K8",  # hashed "password123"
        first_name="John",
        last_name="Smith",
        accessibility_preferences={
            "voice_speed": 0.8,
            "high_contrast": True,
            "large_text": True,
            "voice_navigation": True,
            "reminder_frequency": "high",
            "preferred_voice": "enhanced"
        },
        timezone="America/New_York"
    )
    
    # User with memory difficulties
    user2 = User(
        email="mary@example.com",
        password_hash="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K8K8K8",  # hashed "password123"
        first_name="Mary",
        last_name="Johnson",
        accessibility_preferences={
            "voice_speed": 1.0,
            "high_contrast": False,
            "large_text": False,
            "voice_navigation": True,
            "reminder_frequency": "high",
            "preferred_voice": "clear"
        },
        timezone="America/Chicago"
    )
    
    # User with cognitive difficulties
    user3 = User(
        email="bob@example.com",
        password_hash="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K8K8K8",  # hashed "password123"
        first_name="Bob",
        last_name="Wilson",
        accessibility_preferences={
            "voice_speed": 0.7,
            "high_contrast": True,
            "large_text": True,
            "voice_navigation": True,
            "reminder_frequency": "normal",
            "preferred_voice": "simple"
        },
        timezone="America/Los_Angeles"
    )
    
    db.add_all([user1, user2, user3])
    db.commit()
    return [user1, user2, user3]


def create_sample_tasks(db: Session, users):
    """Create sample tasks for users."""
    
    tasks = []
    
    # Tasks for John (vision difficulties)
    tasks.extend([
        Task(
            user_id=users[0].id,
            title="Read medication labels",
            description="Use voice assistance to read medication instructions",
            priority="high",
            category="health",
            due_date=datetime.utcnow() + timedelta(hours=2),
            has_voice_reminder=True,
            reminder_text="Time to take your morning medication. Please use voice assistance to read the label."
        ),
        Task(
            user_id=users[0].id,
            title="Check email",
            description="Review important emails with text-to-speech",
            priority="medium",
            category="work",
            due_date=datetime.utcnow() + timedelta(hours=4),
            has_voice_reminder=True,
            reminder_text="You have new emails. Would you like me to read them to you?"
        )
    ])
    
    # Tasks for Mary (memory difficulties)
    tasks.extend([
        Task(
            user_id=users[1].id,
            title="Doctor appointment",
            description="Annual checkup at 2:00 PM",
            priority="high",
            category="health",
            due_date=datetime.utcnow() + timedelta(days=1),
            has_voice_reminder=True,
            reminder_text="You have a doctor appointment tomorrow at 2:00 PM. Don't forget to bring your insurance card."
        ),
        Task(
            user_id=users[1].id,
            title="Call pharmacy",
            description="Refill prescription for blood pressure medication",
            priority="medium",
            category="health",
            due_date=datetime.utcnow() + timedelta(hours=6),
            has_voice_reminder=True,
            reminder_text="Time to call the pharmacy for your prescription refill."
        )
    ])
    
    # Tasks for Bob (cognitive difficulties)
    tasks.extend([
        Task(
            user_id=users[2].id,
            title="Take a walk",
            description="20-minute walk around the neighborhood",
            priority="medium",
            category="health",
            due_date=datetime.utcnow() + timedelta(hours=3),
            has_voice_reminder=True,
            reminder_text="It's time for your daily walk. Remember to wear comfortable shoes and bring water."
        ),
        Task(
            user_id=users[2].id,
            title="Family dinner",
            description="Dinner with family at 6:00 PM",
            priority="high",
            category="personal",
            due_date=datetime.utcnow() + timedelta(days=2),
            has_voice_reminder=True,
            reminder_text="Family dinner is in 2 days at 6:00 PM. Don't forget to bring the dessert you promised."
        )
    ])
    
    db.add_all(tasks)
    db.commit()
    return tasks


def create_sample_reminders(db: Session, users):
    """Create sample reminders."""
    
    reminders = []
    
    # Reminders for John
    reminders.extend([
        Reminder(
            user_id=users[0].user_id,
            title="Medication Reminder",
            description="Time to take your morning medication. Please use voice assistance to read the label.",
            reminder_datetime=datetime.utcnow() + timedelta(minutes=30),
            frequency="daily",
            priority="high"
        ),
        Reminder(
            user_id=users[0].user_id,
            title="Email Check",
            description="You have new emails. Would you like me to read them to you?",
            reminder_datetime=datetime.utcnow() + timedelta(hours=2),
            frequency="once",
            priority="medium"
        )
    ])
    
    # Reminders for Mary
    reminders.extend([
        Reminder(
            user_id=users[1].user_id,
            title="Doctor Appointment",
            description="You have a doctor appointment tomorrow at 2:00 PM. Don't forget to bring your insurance card.",
            reminder_datetime=datetime.utcnow() + timedelta(hours=12),
            frequency="once",
            priority="urgent"
        ),
        Reminder(
            user_id=users[1].user_id,
            title="Pharmacy Call",
            description="Time to call the pharmacy for your prescription refill.",
            reminder_datetime=datetime.utcnow() + timedelta(hours=4),
            frequency="weekly",
            priority="high"
        )
    ])
    
    # Reminders for Bob
    reminders.extend([
        Reminder(
            user_id=users[2].user_id,
            title="Daily Walk",
            description="It's time for your daily walk. Remember to wear comfortable shoes and bring water.",
            reminder_datetime=datetime.utcnow() + timedelta(hours=1),
            frequency="daily",
            priority="medium"
        ),
        Reminder(
            user_id=users[2].user_id,
            title="Family Dinner",
            description="Family dinner is in 2 days at 6:00 PM. Don't forget to bring the dessert you promised.",
            reminder_datetime=datetime.utcnow() + timedelta(days=1),
            frequency="once",
            priority="high"
        )
    ])
    
    db.add_all(reminders)
    db.commit()
    return reminders


def create_notifications(db: Session, users, reminders):
    """Create sample notifications for reminders."""
    
    notifications = []
    
    for i, reminder in enumerate(reminders):
        # Create a voice notification for each reminder
        notification = Notification(
            reminder_id=reminder.reminder_id,
            user_id=reminder.user_id,
            notification_type="voice",
            message=reminder.description or reminder.title,
            scheduled_time=reminder.reminder_datetime,
            sent_time=datetime.utcnow() if i < 2 else None,  # Some sent, some pending
            status="sent" if i < 2 else "pending",
            is_read=i < 1  # First one is read
        )
        notifications.append(notification)
        
        # Create a push notification for high priority reminders
        if reminder.priority in ["high", "urgent"]:
            push_notification = Notification(
                reminder_id=reminder.reminder_id,
                user_id=reminder.user_id,
                notification_type="push",
                message=f"Reminder: {reminder.title}",
                scheduled_time=reminder.reminder_datetime - timedelta(minutes=5),  # 5 min before
                sent_time=datetime.utcnow() if i < 3 else None,
                status="sent" if i < 3 else "pending",
                is_read=False
            )
            notifications.append(push_notification)
    
    db.add_all(notifications)
    db.commit()
    return notifications


def create_user_settings(db: Session, users):
    """Create user settings for users."""
    
    user_settings = []
    
    for i, user in enumerate(users):
        # Create multiple settings for each user
        settings_list = [
            UserSettings(
                user_id=user.user_id,
                setting_name="voice_name",
                setting_value="enhanced" if i == 0 else "clear" if i == 1 else "simple"
            ),
            UserSettings(
                user_id=user.user_id,
                setting_name="speech_rate",
                setting_value=str(0.8 if i == 0 else 1.0 if i == 1 else 0.7)
            ),
            UserSettings(
                user_id=user.user_id,
                setting_name="theme",
                setting_value="auto"
            ),
            UserSettings(
                user_id=user.user_id,
                setting_name="font_size",
                setting_value="large" if i in [0, 2] else "medium"
            ),
            UserSettings(
                user_id=user.user_id,
                setting_name="push_notifications",
                setting_value="true"
            ),
            UserSettings(
                user_id=user.user_id,
                setting_name="email_notifications",
                setting_value="true"
            ),
            UserSettings(
                user_id=user.user_id,
                setting_name="reminder_sound",
                setting_value="true"
            ),
            UserSettings(
                user_id=user.user_id,
                setting_name="high_contrast",
                setting_value="true" if i in [0, 2] else "false"
            )
        ]
        user_settings.extend(settings_list)
    
    db.add_all(user_settings)
    db.commit()
    return user_settings


def create_tts_history(db: Session, users):
    """Create sample TTS usage history."""
    
    tts_logs = []
    
    for i, user in enumerate(users):
        # Sample TTS history for each user
        tts_logs.extend([
            TTSHistory(
                user_id=user.user_id,
                content="Time to take your morning medication",
                voice_settings={
                    "voice_name": "enhanced" if i == 0 else "clear" if i == 1 else "simple",
                    "language": "en-US"
                },
                speech_rate=0.8 if i == 0 else 1.0 if i == 1 else 0.7,
                volume=1.0,
                duration_seconds=3.2,
                context="reminder"
            ),
            TTSHistory(
                user_id=user.user_id,
                content="You have 3 new tasks to complete today",
                voice_settings={
                    "voice_name": "enhanced" if i == 0 else "clear" if i == 1 else "simple",
                    "language": "en-US"
                },
                speech_rate=0.8 if i == 0 else 1.0 if i == 1 else 0.7,
                volume=1.0,
                duration_seconds=4.1,
                context="notification"
            )
        ])
    
    db.add_all(tts_logs)
    db.commit()
    return tts_logs


def create_device_sync(db: Session, users):
    """Create sample device sync records for users."""
    
    device_syncs = []
    
    for i, user in enumerate(users):
        # Each user has a mobile device
        device_sync = DeviceSync(
            user_id=user.user_id,
            device_identifier=f"device_{user.user_id}_001",
            device_name=f"{user.first_name}'s iPhone" if i == 0 else f"{user.first_name}'s Android" if i == 1 else f"{user.first_name}'s Tablet",
            device_type="mobile" if i < 2 else "tablet",
            platform="ios" if i == 0 else "android",
            app_version="1.0.0",
            sync_status="active",
            sync_data={
                "last_backup": datetime.utcnow().isoformat(),
                "sync_count": 15,
                "preferences_synced": True
            }
        )
        device_syncs.append(device_sync)
    
    db.add_all(device_syncs)
    db.commit()
    return device_syncs


def create_accessibility_logs(db: Session, users):
    """Create sample accessibility usage logs."""
    
    logs = []
    
    for user in users:
        # Sample logs for each user
        logs.extend([
            AccessibilityLog(
                user_id=user.user_id,
                feature_used="tts",
                action="read_task_description",
                session_id="session_001",
                context_data={"task_id": 1, "text_length": 50}
            ),
            AccessibilityLog(
                user_id=user.user_id,
                feature_used="voice_navigation",
                action="navigate_to_reminders",
                session_id="session_001",
                context_data={"from_screen": "home", "to_screen": "reminders"}
            ),
            AccessibilityLog(
                user_id=user.user_id,
                feature_used="high_contrast",
                action="toggle_high_contrast",
                session_id="session_002",
                context_data={"enabled": True}
            )
        ])
    
    db.add_all(logs)
    db.commit()
    return logs


def seed_database():
    """Seed the database with sample data."""
    db = SessionLocal()
    
    try:
        # Create sample data
        users = create_sample_users(db)
        tasks = create_sample_tasks(db, users)
        reminders = create_sample_reminders(db, users)
        notifications = create_notifications(db, users, reminders)
        user_settings = create_user_settings(db, users)
        tts_history = create_tts_history(db, users)
        device_syncs = create_device_sync(db, users)
        logs = create_accessibility_logs(db, users)
        
        print(f"Database seeded successfully!")
        print(f"- {len(users)} users created")
        print(f"- {len(tasks)} tasks created")
        print(f"- {len(reminders)} reminders created")
        print(f"- {len(notifications)} notifications created")
        print(f"- {len(user_settings)} user settings created")
        print(f"- {len(tts_history)} TTS history entries created")
        print(f"- {len(device_syncs)} device sync records created")
        print(f"- {len(logs)} accessibility logs created")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
