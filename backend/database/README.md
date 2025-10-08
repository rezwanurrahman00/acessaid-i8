# AccessAid Database

This directory contains the database setup and models for the AccessAid assistive technology application.

## Database Structure

The database is designed to support users with various accessibility needs including vision, memory, and cognitive difficulties.

### Models

#### User (Core Entity)
- **Primary Key**: `user_id`
- **Login Info**: `email`, `password_hash`
- **Personal Info**: `first_name`, `last_name`
- **Accessibility Preferences**: JSON field for flexible customization
- **System Fields**: `timezone`, `is_active`, `created_at`, `updated_at`
- **Relationships**: Creates Reminders, Uses TTS History, Has User Settings, Syncs with Devices

#### Task
- Manages user tasks and activities
- Includes priority levels, categories, and due dates
- Supports voice reminders and custom reminder text
- Links to User via `user_id` foreign key

#### Reminder
- **Primary Key**: `reminder_id`
- **Foreign Key**: `user_id` (links to USER)
- **Fields**: `title`, `description`, `reminder_datetime`, `frequency`, `priority`
- **Status**: `is_active`, `is_completed`
- **Relationships**: One user can create many reminders. Each reminder generates notifications.

#### Notification
- **Primary Key**: `notification_id`
- **Foreign Keys**: `reminder_id` (links to REMINDER), `user_id` (links to USER)
- **Fields**: `notification_type` (SMS, email, voice), `message`, `scheduled_time`, `sent_time`
- **Status**: `status`, `is_read`
- **Relationships**: Each reminder can trigger many notifications.

#### TTSHistory
- **Primary Key**: `tts_id`
- **Foreign Key**: `user_id`
- **Fields**: `content` (the text spoken), `voice_settings`, `speech_rate`, `volume`
- **Relationships**: Connected to USER — each user can have many TTS history entries.

#### UserSettings
- **Primary Key**: `setting_id`
- **Foreign Key**: `user_id`
- **Fields**: `setting_name`, `setting_value`, `updated_at`
- **Relationships**: Each user can have multiple settings.

#### DeviceSync
- **Primary Key**: `sync_id`
- **Foreign Key**: `user_id`
- **Fields**: `device_identifier`, `last_sync`, `sync_status`, `sync_data`
- **Relationships**: One user can sync to multiple devices.

#### AccessibilityLog
- Tracks usage of accessibility features
- Helps improve the app based on user behavior
- Stores session data and feature usage patterns

#### MLModel
- Stores machine learning model information
- Tracks model versions and accuracy scores
- Supports different ML models for various features

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Initialize Database
```bash
python setup_database.py
```

This will:
- Create all database tables
- Seed the database with sample data
- Create test users with different accessibility needs

### 3. Verify Setup
The database file `acessaid.db` will be created in the backend directory.

## Sample Data

The database includes sample data for:
- 3 test users with different accessibility needs
- Sample tasks for each user
- Intelligent reminders with ML priority scores
- Voice settings and accessibility preferences
- Usage logs for testing

## Database Features

### Accessibility-First Design
- High contrast mode support
- Large text options
- Voice navigation preferences
- Customizable TTS settings

### Intelligent Reminders
- ML-based priority scoring
- User response tracking
- Recurring reminder patterns
- Context-aware messaging

### User Behavior Tracking
- Feature usage analytics
- Session tracking
- Performance metrics
- Accessibility improvement insights

## Usage in FastAPI

```python
from database import get_db
from models import User, Task, Reminder

# In your FastAPI endpoint
def get_user_tasks(user_id: int, db: Session = Depends(get_db)):
    return db.query(Task).filter(Task.user_id == user_id).all()
```

## Development Notes

- Uses SQLite for prototyping (as specified in requirements)
- Easy to migrate to PostgreSQL for production
- Includes comprehensive sample data for testing
- Designed for accessibility-first development
