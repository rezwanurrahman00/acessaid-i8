# AccessAid ♿

AccessAid is a comprehensive React Native application designed to enhance daily accessibility for persons with disabilities. Built with modern accessibility standards (WCAG 2.2 AA compliance), the app features voice control, camera OCR, smart reminders, and adaptive UI components.

## ✨ Key Features

🎤 **Voice Control** - Comprehensive voice command framework with screen announcements and TTS feedback   
📸 **Camera OCR** - Enhanced camera reader module with OCR text extraction, safety checks (low-light/blurry detection), large readable font display, and integrated TTS  
🎙️ **Speech-to-Text** - Voice input capability for reminders, forms, and general text entry throughout the app  
🔊 **Voice Announcement Toggle** - Global TTS switch to control screen titles, button labels, and OCR text reading with persistent preferences  
⏰ **Smart Reminders** - Full featured reminder system with categories, priorities, recurrence, and real-time alerts  
♿ **Accessibility First** - Complete dynamic text scaling, brightness control, and screen reader support  
🎨 **Adaptive UI** - Full dark mode, high contrast, and customizable interface elements  
🔐 **Secure Authentication** - Working email/PIN authentication with local data storage

## Welcome to your Expo app 👋

This project was bootstrapped with create-expo-app.

### Get started

1) Install dependencies

```bash
npm install
```

2) Start the app

> **⚠️ Important: Voice Recognition Limitations**  
> Voice recognition (`expo-speech-recognition`) is a **native module** and will **NOT work with Expo Go**.  
> To test voice commands, you must build the app on a physical device or emulator.

#### Option A: Development Build (Recommended for Voice Features)

**For Android:**
```bash
npx expo run:android --device
```

**For iOS:**
```bash
npx expo run:ios --device
```

This builds and installs the app with native modules on your connected device.

#### Option B: Expo Go (Limited Features)

```bash
npx expo start
```

From the Expo CLI, you can open the app in Expo Go, but note:
- ✅ Text-to-Speech (TTS) works
- ✅ OCR and camera features work
- ✅ Reminders and UI features work
- ❌ Voice recognition/commands will NOT work
- ❌ Voice input will NOT work

**When you're ready for a fresh start:**

```bash
npm run reset-project
```

This moves the starter code to `app-example/` and creates a blank `app/` directory.

Useful docs:
- Expo docs: https://docs.expo.dev/
- Learn Expo: https://docs.expo.dev/tutorial/introduction/
- Community: https://github.com/expo/expo and https://chat.expo.dev/

---

## AccessAid – Project I-8

AI/ML Tool to Help Persons with Disabilities

Team: Code Innovators

### Team Members
- Gautam Aryal (@Aryalgautam1)
- Allen Pandey (@Allenpandey1)
- Aasmi Joshi (@aasjos)
- Sworup Bohara (@sb2933)
- Rezwanur Rahman (@rezwanurrahman00)

### Project Summary
AccessAid is an assistive-technology application that applies AI/ML to improve daily accessibility for persons with disabilities.
- Capstone 1: MVP for a focused use case with accessible UI
- Capstone 2: Feature expansion, UX polish, scalable cloud services

### Tech Stack
- **Frontend**: React Native (Expo) with TypeScript
- **Backend**: FastAPI (Python)
- **Database**: SQLite (with SQLAlchemy ORM)
- **State Management**: React Context API
- **Storage**: AsyncStorage for local persistence
- **Navigation**: Expo Router with Stack and Tab navigation

### Repo Conventions
- Branches: `main` (protected), `dev`, feature branches `feat/<name>`
- Pull Requests: reviewed before merge
- Issues: tagged with `feature`, `bug`, `priority`
- Commits: Conventional Commits (e.g., `feat(ui): add accessibility toggle`)

---

## 📅 Sprint Overview

### Sprint 0: Planning & Setup
- ✅ Define target disability group
- ✅ Competitive scan (existing tools)
- ✅ Select MVP features (2–3)
- ✅ Wireframes & accessibility spec (WCAG 2.2)
- ✅ Architecture diagram & tech stack decision
- ✅ Repo + CI boilerplate
- ✅ Trello board and working agreements

### Sprint 1: Basic App Setup ✅

**Goal**: Establish the foundation and basic structure of the application.

**Completed**:
- ✅ Project initialization with Expo and React Native
- ✅ TypeScript configuration and setup
- ✅ Basic folder structure and file organization
- ✅ Navigation setup (Expo Router with Stack and Tab navigation)
- ✅ Basic UI components and styling foundation
- ✅ Environment configuration
- ✅ Development environment setup

### Sprint 2: Core Features Implementation ✅

**Goal**: Implement core functionality and accessibility features.

**Completed**:

#### 🔐 Authentication & User Management
- Sign In/Sign Up with email and password authentication
- User profiles with photo picker and editable preferences
- Per-user data isolation with AsyncStorage persistence
- Secure logout functionality

#### 🎤 Voice Features
- Full voice command system with keyword recognition
- Text-to-Speech (TTS) with adjustable speed (0.5x-2.0x)
- Voice input for text entry
- Voice feedback for all actions
- Centralized voice command manager

#### 📱 Core Features
- Home screen with TTS input and camera OCR reader
- Camera OCR integration for text extraction from images
- **Advanced reminder system** with:
  - Full CRUD operations (Create, Read, Update, Delete)
  - 7 categories: Personal, Work, Health, Medicine, Finance, Shopping, Other
  - 3 priority levels: Low, Medium, High (color-coded)
  - Recurrence options: Once, Daily, Weekly, Monthly
  - Date and time picker with improved UI
  - Real-time reminder alerts with modal notifications
  - Visual indicators (priority colors, category icons)
  - Filter and search functionality
- Settings screen for app configuration
- Profile screen for user information management

#### ⚙️ Accessibility Features
- Live screen brightness control (0-100%)
- Dynamic text zoom (80%-180%)
- Adjustable voice speed for TTS
- Dark mode toggle
- Haptic feedback for interactions
- Full screen reader support with accessibility labels

#### 🎨 UI/UX Improvements
- Modern design with gradient backgrounds and animations
- Reusable UI components (ModernButton, ModernCard, etc.)
- Responsive layout for different screen sizes
- High contrast styling for accessibility

#### 🔧 Backend & API
- FastAPI backend with RESTful API endpoints
- SQLite database with SQLAlchemy ORM
- Complete database models (User, Reminder, Task, Notification, TTSHistory, UserSettings)
- Full CRUD operations for all entities
- API health check endpoint

---

### Sprint 3: Major Feature Implementations ✅

**Goal**: Implement advanced accessibility features including enhanced camera OCR with safety checks, comprehensive speech-to-text capabilities, and global voice announcement controls for improved user experience.

**Completed**:

#### 📸 Camera Reader Module (OCR + TTS)
- Enhanced camera integration for capturing text from real-world scenarios
- Users can take photos of text from:
  - Menus and restaurant signs
  - Street signs and wayfinding markers
  - Documents and printed materials
- OCR text extraction and display in large, readable font for better visibility
- **Safety checks and quality validation**:
  - Low-light image detection with user prompts
  - Blurry image detection and "Retake Photo" suggestions
  - Quality assurance before processing
- Seamless integration with Text-to-Speech system
- Extracted text automatically read aloud to users
- Improved accessibility for users with visual impairments

#### 🎙️ Speech-to-Text (Voice Input)
- Comprehensive voice input capabilities across the application
- Users can speak instead of typing for:
  - **Reminder text** - Create reminders using voice commands
  - **Form fields** - Fill out any form field using voice
  - **General input** - Voice input available throughout the app
- Significant accessibility improvement for users with:
  - Motor challenges or dexterity difficulties
  - Small-keyboard navigation challenges
  - Prefer voice interaction over typing
- Enhanced user experience with hands-free operation

#### 🔊 Voice Announcement Toggle (Global TTS Switch)
- Centralized control for all Text-to-Speech features
- Users can toggle voice announcements for:
  - **Screen titles** - Automatic reading of screen names
  - **Button labels** - Voice feedback for button interactions
  - **OCR-extracted text** - Control whether extracted text is read aloud
- **Smart audio management**:
  - Prevents audio conflicts between STT (Speech-to-Text) and TTS
  - Avoids overlapping voice feedback
  - Better control over when audio is active
- **Persistent preferences**:
  - User settings saved across app sessions
  - Personalized accessibility experience
  - Respects user preferences for voice interactions

---

## 🔌 APIs Used

AccessAid integrates with the following APIs to provide its functionality:

### 1. OCR.Space API (External Third-Party API)

**Purpose**: Optical Character Recognition (OCR) for text extraction from images and PDF documents.

**Description**: 
OCR.Space is a cloud-based OCR service that allows AccessAid to extract text from images captured by the camera or selected from the photo library. This enables users with visual impairments or reading difficulties to have images read aloud by the app.

**Usage in AccessAid**:
- Camera OCR: Users can capture images using the device camera and extract text from them
- Image Picker OCR: Users can select existing images from their photo library for text extraction
- PDF Support: The API also supports extracting text from PDF documents
- Text-to-Speech Integration: Extracted text is automatically passed to the TTS system for audio output

**API Details**:
- **Endpoint**: `https://api.ocr.space/parse/image`
- **Method**: POST
- **Authentication**: API Key (configured in `app.json`)
- **Supported Formats**: 
  - Images: JPEG, PNG, GIF, BMP
  - Documents: PDF
- **Engine**: OCR Engine 2 (default)
- **Language**: English (eng)

**Configuration**:
The API key is stored in `app.json` under the `extra` section:
```json
{
  "extra": {
    "OCR_SPACE_API_KEY": "your-api-key-here"
  }
}
```

**Getting an API Key**:
1. Visit [OCR.Space API](https://ocr.space/OCRAPI)
2. Sign up for a free or paid account
3. Generate an API key from your dashboard
4. Add the key to `app.json` as shown above
5. Restart the Expo development server

**Rate Limits**:
- Free tier: 25,000 requests/month
- Paid plans available for higher usage

**Error Handling**:
- API key validation on app startup
- User-friendly error messages if API key is missing
- Graceful fallback with alerts when OCR fails
- Detailed console logging for debugging

**Code Location**: `src/screens/HomeScreen.tsx` - `extractTextWithOCRSpace()` function

---

### 2. AccessAid Custom Backend API (Internal FastAPI)

**Purpose**: Backend service for user data management, reminders, settings, and TTS history storage.

**Description**:
A custom RESTful API built with FastAPI (Python) that handles all backend operations for AccessAid. The API manages user data, reminders, accessibility preferences, and maintains a history of TTS usage for analytics.

**Base URL**: `http://192.168.0.220:8000/api` (configurable via `services/api.ts`)

**API Endpoints**:

#### Health Check
- **GET** `/` - API health check endpoint
  - Returns: `{ "message": "AccessAid API is running!", "status": "healthy" }`

#### User Endpoints
- **GET** `/api/users` - Get all users
- **GET** `/api/users/{user_id}` - Get user by ID
- **POST** `/api/users` - Create new user
- **PUT** `/api/users/{user_id}` - Update user
- **DELETE** `/api/users/{user_id}` - Delete user

#### Reminder Endpoints
- **GET** `/api/users/{user_id}/reminders` - Get all reminders for a user
- **GET** `/api/reminders/{reminder_id}` - Get reminder by ID
- **POST** `/api/reminders` - Create new reminder
- **PUT** `/api/reminders/{reminder_id}` - Update reminder
- **DELETE** `/api/reminders/{reminder_id}` - Delete reminder

#### Settings Endpoints
- **GET** `/api/users/{user_id}/settings` - Get user settings
- **POST** `/api/users/{user_id}/settings` - Update user setting

#### TTS History Endpoints
- **GET** `/api/users/{user_id}/tts-history` - Get TTS usage history
- **POST** `/api/users/{user_id}/tts-history` - Log TTS usage

**Database Models**:
- `User` - User accounts and profiles
- `Reminder` - Reminder entries with categories and priorities
- `Task` - Task management
- `Notification` - Notification tracking
- `TTSHistory` - Text-to-speech usage logs
- `UserSettings` - User accessibility preferences
- `DeviceSync` - Device synchronization data

**Technology Stack**:
- **Framework**: FastAPI 0.104.1
- **Database**: SQLite with SQLAlchemy ORM 2.0.23
- **Server**: Uvicorn ASGI server
- **Authentication**: Python-JOSE with bcrypt
- **CORS**: Enabled for React Native frontend

**Offline Support**:
The frontend includes offline fallback mechanisms. When the backend API is unavailable:
- Mock data is used automatically
- User operations continue with local storage
- Data syncs when connection is restored

**Code Locations**:
- Backend API: `backend/main.py`
- Frontend API Service: `services/api.ts`
- Database Models: `backend/database/models.py`
- Database Setup: `backend/database/database.py`

**Running the Backend**:
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**API Documentation**:
Once the backend is running, visit `http://localhost:8000/docs` for interactive Swagger/OpenAPI documentation.

---

### API Integration Summary

| API | Type | Purpose | Status |
|-----|------|---------|--------|
| OCR.Space | External | Text extraction from images/PDFs | ✅ Active |
| AccessAid Backend | Internal | User data & app features | ✅ Active |

**Note**: Ensure both APIs are properly configured before deploying to production. The OCR.Space API key must be secured and not exposed in version control.

#### 📂 Code Organization
- TypeScript throughout for type safety
- Context API for state management (AppContext, AuthContext)
- Organized component and screen architecture
- Service layer abstractions
- Comprehensive error handling

---

## 📋 Current Status

The app is now fully functional with all Sprint 1, 2, and 3 features implemented. The foundation established in Sprint 1 was expanded in Sprint 2 with core accessibility features, authentication, voice commands, and a complete backend API. Sprint 3 added major feature implementations including enhanced Camera Reader Module with OCR and safety checks, comprehensive Speech-to-Text voice input capabilities, and a global Voice Announcement Toggle system for improved accessibility control. The application is production-ready with comprehensive accessibility features for users with disabilities.

## Scripts
- `npm start` – Start the Expo dev server (⚠️ Voice features won't work in Expo Go)
- `npm run android` – Build and run on Android emulator/device with full native features
- `npm run ios` – Build and run on iOS simulator/device with full native features (macOS only)
- `npm run web` – Run the web build (⚠️ Limited native features)

## License
© Code Innovators. All rights reserved.
