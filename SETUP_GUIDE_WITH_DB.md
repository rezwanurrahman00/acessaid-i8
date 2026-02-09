# AccessAid Setup Guide

Complete guide to setting up AccessAid with MySQL database from scratch.

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Python 3.8+**
- **MySQL 9.x** or **MySQL 8.x**
- **Expo CLI**: `npm install -g expo-cli`
- **iOS**: Xcode (for iOS development)
- **Android**: Android Studio (for Android development)

---

## Part 1: MySQL Database Setup

### 1.1 Install MySQL

#### macOS (using Homebrew)
```bash
# Install MySQL 9.x
brew install mysql

# Start MySQL service
brew services start mysql

# Verify installation
mysql --version
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### Windows
Download and install from [MySQL official website](https://dev.mysql.com/downloads/mysql/)

### 1.2 Secure MySQL Installation (Optional but Recommended)
```bash
mysql_secure_installation
```

### 1.3 Create Database and User

```bash
# Login to MySQL as root
mysql -u root -p

# If no password is set, use:
mysql -u root
```

Then run these SQL commands:

```sql
-- Create the database
CREATE DATABASE accessaid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a dedicated user (optional - you can use root)
CREATE USER 'accessaid_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON accessaid.* TO 'accessaid_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify database creation
SHOW DATABASES;

-- Exit MySQL
EXIT;
```

---

## Part 2: Backend Setup

### 2.1 Navigate to Backend Directory
```bash
cd backend
```

### 2.2 Create Python Virtual Environment (Recommended)
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

### 2.3 Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2.4 Configure Database Connection

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=accessaid

# For non-root user:
# MYSQL_USER=accessaid_user
# MYSQL_PASSWORD=your_secure_password
```

### 2.5 Initialize Database Tables

Run the setup script to create all tables:

```bash
python3 setup_database.py
```

You should see output like:
```
✅ Database tables created successfully!
```

### 2.6 Verify Database Tables

```bash
mysql -u root accessaid -e "SHOW TABLES;"
```

Expected output:
```
+---------------------+
| Tables_in_accessaid |
+---------------------+
| accessibility_logs  |
| device_sync         |
| ml_models          |
| notifications       |
| reminders          |
| tasks              |
| tts_history        |
| user_settings      |
| users              |
+---------------------+
```

---

## Part 3: Frontend Setup

### 3.1 Install Dependencies

From the project root:

```bash
npm install
# or
yarn install
```

### 3.2 Update API Base URL

Find your machine's IP address:

```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

Edit `services/api.ts` and update the IP address:

```typescript
// Change this to your machine's IP address
const API_BASE_URL = 'http://YOUR_IP_ADDRESS:8000/api';

// Example:
const API_BASE_URL = 'http://192.168.1.71:8000/api';
```

**Note:** 
- For **iOS Simulator**: Use `http://localhost:8000/api`
- For **Android Emulator**: Use `http://10.0.2.2:8000/api`
- For **Physical Devices**: Use your machine's IP address

---

## Part 4: Running the Application

### 4.1 Start Backend Server

Open a new terminal and navigate to the backend directory:

```bash
cd backend

# Activate virtual environment if you created one
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Start FastAPI server
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
✅ Database tables created successfully!
INFO:     Application startup complete.
```

### 4.2 Test Backend API

In another terminal:

```bash
# Test health endpoint
curl http://localhost:8000/

# Expected response:
# {"message":"AccessAid API is running!","status":"healthy"}
```

### 4.3 Start Expo Development Server

From the project root:

```bash
npx expo start
```

### 4.4 Run on Device/Emulator

**For iOS Simulator:**
```bash
npx expo run:ios
```

**For Android Device (Recommended for full features):**
```bash
# Connect your Android device via USB and enable USB debugging
npx expo run:android --device
```

**For Android Emulator:**
```bash
npx expo run:android
```

**For Expo Go (Limited Features):**
- Scan the QR code with Expo Go app
- Note: Voice recognition won't work in Expo Go

---

## Part 5: First Time Use

### 5.1 Create an Account

1. Launch the app
2. You'll see the login screen
3. Tap **"Create Account"** or use the registration feature
4. Enter your email and create a 4-digit PIN

### 5.2 Test Reminder Creation

1. Navigate to the **Reminders** tab
2. Tap the **+** button
3. Create a test reminder:
   - Title: "Test Reminder"
   - Date: Select a future time
   - Tap **"Create Reminder"**

### 5.3 Verify Database Storage

Check that the reminder was saved to MySQL:

```bash
mysql -u root accessaid -e "SELECT * FROM reminders;"
```

You should see your test reminder with all details!

---

## Part 6: Troubleshooting

### Issue: "Connection refused" or Backend not accessible

**Solution:**
1. Verify backend is running:
   ```bash
   curl http://localhost:8000/
   ```

2. Check your IP address in `services/api.ts` matches your machine's actual IP

3. Ensure your device and computer are on the same WiFi network

### Issue: "Access denied for user" (MySQL)

**Solution:**
1. Verify MySQL credentials in `backend/.env`
2. Test MySQL connection:
   ```bash
   mysql -u root -p accessaid
   ```

### Issue: "Database 'accessaid' doesn't exist"

**Solution:**
```bash
mysql -u root -e "CREATE DATABASE accessaid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
python3 backend/setup_database.py
```

### Issue: "Port 8000 already in use"

**Solution:**
```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use a different port
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
# Then update API_BASE_URL in services/api.ts
```

### Issue: Voice features not working

**Solution:**
Voice recognition requires a **development build**, not Expo Go:
```bash
npx expo run:android --device
```

### Issue: Reminders not saving to database

**Solution:**
1. Check backend logs for errors
2. Verify `created_at` field is returned by the API:
   ```bash
   curl -X POST "http://localhost:8000/api/users/1/reminders?title=Test&reminder_datetime=2026-02-10T15:00:00Z&frequency=once&priority=medium"
   ```
3. Ensure backend server is running with latest code

---

## Part 7: Database Management

### View All Users
```bash
mysql -u root accessaid -e "SELECT user_id, email, first_name, last_name, created_at FROM users;"
```

### View All Reminders
```bash
mysql -u root accessaid -e "SELECT reminder_id, user_id, title, reminder_datetime, frequency, priority FROM reminders;"
```

### Clear All Data (Fresh Start)
```bash
mysql -u root accessaid -e "
DELETE FROM reminders;
DELETE FROM notifications;
DELETE FROM tasks;
DELETE FROM tts_history;
DELETE FROM accessibility_logs;
DELETE FROM user_settings;
DELETE FROM device_sync;
DELETE FROM users;
"
```

### Backup Database
```bash
mysqldump -u root accessaid > accessaid_backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
mysql -u root accessaid < accessaid_backup_20260208.sql
```

---

## Part 8: Development Workflow

### Typical Development Session

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
npx expo start
```

**Terminal 3 - Device (if needed):**
```bash
npx expo run:android --device
```

### Making Changes

**Backend changes:**
- Edit files in `backend/`
- Uvicorn auto-reloads when you save
- Check logs in Terminal 1

**Frontend changes:**
- Edit files in `src/`, `app/`, etc.
- Expo auto-reloads on save
- Shake device to open dev menu

**Database schema changes:**
- Edit `backend/database/models.py`
- Run `python3 setup_database.py` to recreate tables
- Or manually alter tables with SQL

---

## Part 9: Project Structure

```
acessaid-i8/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   ├── auth.tsx           # Authentication screen
│   └── _layout.tsx        # Root layout
├── backend/               # FastAPI backend
│   ├── main.py           # API endpoints
│   ├── database/         # Database models and config
│   │   ├── models.py     # SQLAlchemy models
│   │   └── database.py   # Database connection
│   ├── setup_database.py # Database initialization
│   ├── requirements.txt  # Python dependencies
│   └── .env             # Database credentials
├── services/             # Frontend API services
│   └── api.ts           # API client with backend calls
├── src/
│   ├── components/      # Reusable components
│   ├── contexts/        # React contexts (Auth, App)
│   ├── screens/         # Screen components
│   │   └── ReminderScreen.tsx
│   └── utils/           # Utility functions
├── constants/           # Theme and constants
└── package.json        # Node dependencies
```

---

## Part 10: Additional Resources

- **MySQL Documentation**: https://dev.mysql.com/doc/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Expo Documentation**: https://docs.expo.dev/
- **React Native Documentation**: https://reactnative.dev/

---

## Support

If you encounter issues not covered in this guide:

1. Check the backend logs in Terminal 1
2. Check the Expo logs in Terminal 2
3. Verify MySQL is running: `brew services list` (macOS)
4. Test API endpoints with curl or Postman
5. Check that all dependencies are installed

---

**Happy Coding! 🚀**

For more details, see:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment
- [FEATURES.md](./FEATURES.md) - Feature documentation
- [backend/MYSQL_MIGRATION.md](./backend/MYSQL_MIGRATION.md) - Database migration details
