# AccessAid Database Testing Guide

This guide will help you test and verify that your AccessAid database is working correctly.

## 🚀 Quick Start Testing

### Option 1: Quick Test (Recommended for first-time setup)
```bash
cd acessaid-i8/backend
python quick_test.py
```

This will:
- Create all database tables
- Seed with sample data
- Run basic queries
- Show you what was created

### Option 2: Comprehensive Testing
```bash
cd acessaid-i8/backend
python test_database.py
```

This will run all tests including:
- Database connection
- Table creation
- Model relationships
- Seed data verification
- Common queries

## 📋 Manual Testing Steps

### 1. Install Dependencies
```bash
cd acessaid-i8/backend
pip install -r requirements.txt
```

### 2. Set Up Database
```bash
python setup_database.py
```

### 3. Verify Database File
Check that `acessaid.db` was created in the backend directory.

### 4. Test Database Queries
You can also test manually using Python:

```python
from database import get_db
from database.models import User, Reminder, Notification

# Get database session
db = next(get_db())

# Test queries
users = db.query(User).all()
print(f"Found {len(users)} users")

reminders = db.query(Reminder).all()
print(f"Found {len(reminders)} reminders")

notifications = db.query(Notification).all()
print(f"Found {len(notifications)} notifications")

db.close()
```

## 🔍 What to Look For

### Successful Setup Should Show:
- ✅ Database file `acessaid.db` created
- ✅ 3 test users created (John, Mary, Bob)
- ✅ Sample tasks, reminders, and notifications
- ✅ TTS history entries
- ✅ User settings for each user
- ✅ Device sync records
- ✅ Accessibility logs

### Test Users Created:
1. **John Smith** (john@example.com)
   - Vision difficulties
   - High contrast mode enabled
   - Slower speech rate (0.8)
   - Enhanced voice

2. **Mary Johnson** (mary@example.com)
   - Memory difficulties
   - Normal speech rate (1.0)
   - Clear voice
   - High reminder frequency

3. **Bob Wilson** (bob@example.com)
   - Cognitive difficulties
   - Much slower speech rate (0.7)
   - Simple voice
   - High contrast and large text

## 🐛 Troubleshooting

### Common Issues:

1. **Import Errors**
   ```
   ModuleNotFoundError: No module named 'database'
   ```
   **Solution**: Make sure you're in the `acessaid-i8/backend` directory

2. **Database Locked**
   ```
   sqlite3.OperationalError: database is locked
   ```
   **Solution**: Close any other programs using the database, or delete `acessaid.db` and recreate

3. **Permission Errors**
   ```
   PermissionError: [Errno 13] Permission denied
   ```
   **Solution**: Make sure you have write permissions in the backend directory

4. **Missing Dependencies**
   ```
   ModuleNotFoundError: No module named 'sqlalchemy'
   ```
   **Solution**: Run `pip install -r requirements.txt`

### Reset Database:
If you need to start fresh:
```bash
cd acessaid-i8/backend
rm acessaid.db  # Delete existing database
python setup_database.py  # Recreate
```

## 📊 Expected Results

After successful setup, you should have:

- **Database File**: `acessaid.db` (SQLite database)
- **Users**: 3 test users with different accessibility needs
- **Tasks**: 6 sample tasks (2 per user)
- **Reminders**: 6 sample reminders with various frequencies
- **Notifications**: 8+ notifications (voice and push)
- **TTS History**: 6 TTS usage records
- **User Settings**: 24 individual settings (8 per user)
- **Device Sync**: 3 device sync records
- **Accessibility Logs**: 9 usage logs (3 per user)

## 🎯 Next Steps

Once testing is successful, you can:

1. **Start FastAPI Backend**: Create API endpoints
2. **Connect React Native**: Integrate with the mobile app
3. **Add Features**: Implement TTS, reminders, etc.
4. **Deploy**: Set up for production

## 📞 Getting Help

If you encounter issues:
1. Check the error messages carefully
2. Verify you're in the correct directory
3. Ensure all dependencies are installed
4. Try resetting the database
5. Check file permissions

The database is designed to be robust and should work out of the box once dependencies are installed correctly.
