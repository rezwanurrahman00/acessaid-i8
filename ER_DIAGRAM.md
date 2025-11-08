# Entity-Relationship (ER) Diagram for AccessAid

## Current Implementation (AsyncStorage - Key-Value)

The current codebase uses **AsyncStorage** (key-value storage) rather than a relational database. However, the data relationships can be represented as follows:

### Entities and Relationships

```
┌─────────────────┐
│      USER       │
├─────────────────┤
│ PK id (string)  │
│    email        │
│    pin          │
│    name         │
│    bio          │
│    weight       │
│    height       │
│    bloodGroup   │
│    allergies    │
│    interests    │
│ profilePhoto    │
└────────┬────────┘
         │
         │ 1:N (One-to-Many)
         │
         │ owns
         │
         ▼
┌─────────────────┐
│    REMINDER     │
├─────────────────┤
│ PK id (string)  │
│ FK user_id      │ (implied via key: "reminders_{user_id}")
│    title        │
│    description  │
│    date         │
│    time         │
│ isCompleted     │
│ isActive        │
│ createdAt       │
│ updatedAt       │
└─────────────────┘
```

### Current Storage Structure

**AsyncStorage Keys:**
- `'user'` → Current logged-in user (single User object)
- `'users'` → Array of all users (directory/index)
- `'reminders_{user_id}'` → Array of reminders for specific user
- `'accessibilitySettings'` → Global accessibility settings
- `'hasCompletedSetup'` → Boolean flag

### Relationship Details

1. **User → Reminders (One-to-Many)**
   - One user can have many reminders
   - Relationship is maintained via the key pattern: `reminders_{user_id}`
   - No foreign key constraint enforced (AsyncStorage limitation)

2. **User → AccessibilitySettings (One-to-One)**
   - Currently stored globally, not per-user
   - Could be extended to per-user settings

---

## Proposed Database Schema (Based on README Backend Plans)

Based on the README mentioning FastAPI backend with SQLite/SQLAlchemy and models like User, Reminder, Task, Notification, TTSHistory, UserSettings, here's the proposed ER structure:

```
┌─────────────────────┐
│        USER         │
├─────────────────────┤
│ PK id (UUID/string) │
│    email (unique)   │
│    password_hash    │
│    name             │
│    bio              │
│    weight           │
│    height           │
│    bloodGroup       │
│    allergies        │
│    interests        │
│ profilePhoto (path) │
│ createdAt           │
│ updatedAt           │
└──────────┬──────────┘
           │
           │ 1:N relationships
           │
    ┌──────┴──────┬──────────┬──────────────┬──────────────┐
    │             │          │              │              │
    ▼             ▼          ▼              ▼              ▼
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐
│REMINDER │ │   TASK   │ │NOTIFICATION│ │TTS_HISTORY │ │USER_SETTINGS │
├─────────┤ ├──────────┤ ├──────────┤ ├──────────────┤ ├──────────────┤
│PK id    │ │PK id     │ │PK id     │ │PK id         │ │PK id         │
│FK user_id│ │FK user_id│ │FK user_id│ │FK user_id    │ │FK user_id    │
│  title  │ │  title   │ │  title   │ │  text        │ │ brightness   │
│desc     │ │desc      │ │  body    │ │  timestamp   │ │ textZoom     │
│  date   │ │status    │ │  read    │ │  duration    │ │ voiceSpeed   │
│  time   │ │priority  │ │createdAt │ │              │ │ isDarkMode   │
│isCompleted│ │dueDate  │ │          │ │              │ │              │
│isActive │ │createdAt │ │          │ │              │ │              │
│createdAt│ │updatedAt │ │          │ │              │ │              │
│updatedAt│ │          │ │          │ │              │ │              │
└─────────┘ └──────────┘ └──────────┘ └──────────────┘ └──────────────┘
```

### Entity Descriptions

#### **USER** (Main Entity)
- **Primary Key**: `id` (string/UUID)
- **Unique**: `email`
- **Attributes**: Personal information, medical info, profile photo
- **Relationships**: One-to-Many with Reminder, Task, Notification, TTSHistory; One-to-One with UserSettings

#### **REMINDER** (Child Entity)
- **Primary Key**: `id` (string/UUID)
- **Foreign Key**: `user_id` → references User.id
- **Attributes**: Title, description, date/time, completion status
- **Relationship**: Many-to-One with User (many reminders belong to one user)

#### **TASK** (Child Entity - mentioned in README)
- **Primary Key**: `id` (string/UUID)
- **Foreign Key**: `user_id` → references User.id
- **Attributes**: Title, description, status, priority, due date
- **Relationship**: Many-to-One with User

#### **NOTIFICATION** (Child Entity)
- **Primary Key**: `id` (string/UUID)
- **Foreign Key**: `user_id` → references User.id
- **Attributes**: Title, body, read status, timestamp
- **Relationship**: Many-to-One with User

#### **TTS_HISTORY** (Child Entity - mentioned in README)
- **Primary Key**: `id` (string/UUID)
- **Foreign Key**: `user_id` → references User.id
- **Attributes**: Text that was read, timestamp, duration
- **Relationship**: Many-to-One with User

#### **USER_SETTINGS** (Child Entity - mentioned in README)
- **Primary Key**: `id` (string/UUID)
- **Foreign Key**: `user_id` → references User.id (unique)
- **Attributes**: Brightness, textZoom, voiceSpeed, isDarkMode
- **Relationship**: One-to-One with User (one settings per user)

### Relationship Cardinality

1. **User ↔ Reminders**: **1:N** (One-to-Many)
   - One user has many reminders
   - Each reminder belongs to one user

2. **User ↔ Tasks**: **1:N** (One-to-Many)
   - One user has many tasks
   - Each task belongs to one user

3. **User ↔ Notifications**: **1:N** (One-to-Many)
   - One user has many notifications
   - Each notification belongs to one user

4. **User ↔ TTS_History**: **1:N** (One-to-Many)
   - One user has many TTS history entries
   - Each history entry belongs to one user

5. **User ↔ User_Settings**: **1:1** (One-to-One)
   - One user has one settings record
   - Each settings record belongs to one user

### SQL Schema Example (Proposed)

```sql
-- Users Table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    bio TEXT,
    weight TEXT,
    height TEXT,
    blood_group TEXT,
    allergies TEXT,
    interests TEXT,
    profile_photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reminders Table
CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Settings Table
CREATE TABLE user_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    brightness INTEGER DEFAULT 50,
    text_zoom INTEGER DEFAULT 100,
    voice_speed REAL DEFAULT 1.0,
    is_dark_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tasks Table
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- TTS History Table
CREATE TABLE tts_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_tts_history_user_id ON tts_history(user_id);
```

### Notes

- **Current Implementation**: Uses AsyncStorage with key-value pairs, no formal foreign keys
- **Data Isolation**: User data is separated using key prefixes (`reminders_{user_id}`)
- **Proposed Migration**: When moving to SQLite/PostgreSQL, proper foreign key constraints would enforce referential integrity
- **Cascade Delete**: If a user is deleted, all related records (reminders, tasks, etc.) should be deleted


