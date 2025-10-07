PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  user_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT UNIQUE,
  password_hash  TEXT,
  first_name     TEXT,
  last_name      TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME,
  is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  accessibility_preferences TEXT,
  timezone       TEXT DEFAULT 'UTC'
);

CREATE TABLE IF NOT EXISTS reminders (
  reminder_id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  reminder_datetime   DATETIME NOT NULL,
  frequency           TEXT,
  is_active           INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  priority            TEXT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME,
  is_completed        INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0,1)),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id       INTEGER NOT NULL,
  user_id           INTEGER NOT NULL,
  notification_type TEXT,
  message           TEXT,
  scheduled_time    DATETIME,
  sent_time         DATETIME,
  status            TEXT DEFAULT 'pending',
  is_read           INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reminder_id) REFERENCES reminders(reminder_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(user_id)      ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_time
  ON reminders (user_id, reminder_datetime);

CREATE INDEX IF NOT EXISTS idx_notifications_reminder_time
  ON notifications (reminder_id, scheduled_time);

CREATE INDEX IF NOT EXISTS idx_notifications_user_status
  ON notifications (user_id, status);
