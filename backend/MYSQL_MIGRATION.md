# SQLite to MySQL Migration Guide

## Overview
This guide will help you migrate your AccessAid backend database from SQLite to MySQL.

## Prerequisites

1. **MySQL Server**: Install MySQL Server 8.0+ on your machine
   - **macOS**: `brew install mysql`
   - **Ubuntu/Debian**: `sudo apt-get install mysql-server`
   - **Windows**: Download from [MySQL website](https://dev.mysql.com/downloads/mysql/)

2. **Start MySQL Service**:
   - **macOS**: `brew services start mysql`
   - **Ubuntu/Debian**: `sudo systemctl start mysql`
   - **Windows**: Start from Services panel

## Step 1: Create MySQL Database

1. Login to MySQL:
```bash
mysql -u root -p
```

2. Create the database:
```sql
CREATE DATABASE accessaid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Create a user (optional but recommended):
```sql
CREATE USER 'accessaid_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON accessaid.* TO 'accessaid_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cd backend
cp .env.example .env
```

2. Edit `.env` file with your MySQL credentials:
```env
MYSQL_USER=root  # or 'accessaid_user' if you created one
MYSQL_PASSWORD=your_password_here
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=accessaid
```

## Step 3: Install Python Dependencies

Install the new MySQL dependencies:
```bash
pip install -r requirements.txt
```

This will install:
- `pymysql` - MySQL driver for Python
- `cryptography` - Required by pymysql for secure connections

## Step 4: Create Tables in MySQL

Run the database setup script:
```bash
python setup_database.py
```

Or start the FastAPI server (tables will be created automatically):
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Step 5: Migrate Data (Optional)

If you have existing data in SQLite that needs to be migrated:

### Option A: Manual Export/Import (Recommended for small datasets)

1. **Export from SQLite**:
```python
# export_sqlite_data.py
import sqlite3
import json

conn = sqlite3.connect('acessaid.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

data = {}
for table in tables:
    table_name = table[0]
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in cursor.fetchall()]
    
    data[table_name] = {
        'columns': columns,
        'rows': rows
    }

with open('sqlite_export.json', 'w') as f:
    json.dump(data, f, indent=2, default=str)

conn.close()
print("Data exported to sqlite_export.json")
```

2. **Import to MySQL**:
```python
# import_to_mysql.py
import json
from database import SessionLocal
from database.models import User, Task, Reminder, Notification, TTSHistory, UserSettings, DeviceSync

db = SessionLocal()

with open('sqlite_export.json', 'r') as f:
    data = json.load(f)

# Import users first (due to foreign key constraints)
if 'users' in data:
    for row in data['users']['rows']:
        # Map row to User model and add to database
        pass  # Implement based on your data structure

# Then import other tables in dependency order
# reminders, tasks, notifications, etc.

db.commit()
db.close()
print("Data imported to MySQL")
```

### Option B: Using Alembic (Recommended for production)

1. Initialize Alembic (if not already done):
```bash
alembic init alembic
```

2. Create a migration:
```bash
alembic revision --autogenerate -m "Initial MySQL migration"
```

3. Run the migration:
```bash
alembic upgrade head
```

## Step 6: Verify Migration

1. Check that tables were created:
```bash
mysql -u root -p
```

```sql
USE accessaid;
SHOW TABLES;
DESCRIBE users;
```

2. Test the API:
```bash
curl http://localhost:8000/
# Should return: {"message": "AccessAid API is running!", "status": "healthy"}
```

3. Test database operations:
```bash
curl http://localhost:8000/api/users
```

## Key Differences Between SQLite and MySQL

### 1. Connection Management
- **SQLite**: Single file, no connection pool needed
- **MySQL**: Network-based, uses connection pooling for performance

### 2. Data Types
- **JSON columns**: Both support JSON, but MySQL has native JSON type
- **DateTime**: MySQL uses timezone-aware datetime by default
- **Auto Increment**: Explicitly set in MySQL with `autoincrement=True`

### 3. Foreign Keys
- **Cascade Deletes**: Now properly enforced with `ondelete="CASCADE"`
- **Referential Integrity**: MySQL enforces this by default (InnoDB)

### 4. Performance
- **Concurrent Access**: MySQL handles multiple connections better
- **Indexing**: More sophisticated indexing options in MySQL
- **Caching**: MySQL has query cache and buffer pool

## Troubleshooting

### Connection Issues

**Error**: `Can't connect to MySQL server`
```bash
# Check if MySQL is running
brew services list  # macOS
sudo systemctl status mysql  # Linux

# Check port 3306 is listening
lsof -i :3306
```

**Error**: `Access denied for user`
- Verify credentials in `.env` file
- Reset MySQL password if needed:
```bash
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
```

### Migration Issues

**Error**: `Table already exists`
```sql
-- Drop all tables and recreate
DROP DATABASE accessaid;
CREATE DATABASE accessaid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Error**: `Foreign key constraint fails`
- Import data in correct order: Users → Reminders/Tasks → Notifications
- Temporarily disable foreign key checks:
```sql
SET FOREIGN_KEY_CHECKS=0;
-- Import data
SET FOREIGN_KEY_CHECKS=1;
```

### Encoding Issues

**Error**: `Incorrect string value`
- Ensure database uses utf8mb4:
```sql
ALTER DATABASE accessaid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Performance Optimization

### 1. Indexing
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_reminder_datetime ON reminders(reminder_datetime);
CREATE INDEX idx_task_due_date ON tasks(due_date);
```

### 2. Connection Pool Tuning
Edit `database.py` if needed:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,        # Increase for high traffic
    max_overflow=40,     # Maximum connections
    pool_recycle=3600    # Recycle after 1 hour
)
```

### 3. Query Optimization
- Use `.limit()` for large result sets
- Add indexes on foreign keys
- Use `select_related()` for joined queries

## Backup and Restore

### Backup
```bash
mysqldump -u root -p accessaid > backup_$(date +%Y%m%d).sql
```

### Restore
```bash
mysql -u root -p accessaid < backup_20260208.sql
```

## Next Steps

1. **Update CI/CD**: Update deployment scripts to use MySQL
2. **Monitor Performance**: Use MySQL slow query log
3. **Set up Replication**: For production high availability
4. **Configure Backups**: Automated daily backups recommended

## Additional Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [SQLAlchemy MySQL Dialect](https://docs.sqlalchemy.org/en/14/dialects/mysql.html)
- [PyMySQL Documentation](https://pymysql.readthedocs.io/)

## Support

If you encounter issues during migration:
1. Check the error logs in terminal
2. Verify MySQL service is running
3. Test connection with MySQL client
4. Review `.env` configuration
