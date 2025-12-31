# AccessAid ♿

AccessAid is a comprehensive React Native application designed to enhance daily accessibility for persons with disabilities. Built with modern accessibility standards (WCAG 2.2 AA compliance), the app features voice control, camera OCR, smart reminders, and adaptive UI components.

## ✨ Key Features

🎤 **Voice Control** - Comprehensive voice command framework with screen announcements and TTS feedback   
📸 **Camera/AI Reader OCR** - Polished AI Reader section with clearer spacing/contrast for capture, upload, and file import (OCR API configuration required)  
🎙️ **Speech-to-Text** - Voice input capability for reminders, forms, and general text entry throughout the app  
🔊 **Voice Announcement Toggle** - Global TTS switch to control screen titles, button labels, and OCR text reading with persistent preferences  
⏰ **Smart Reminders** - Full featured reminder system with categories, priorities, recurrence, and real-time alerts  
♿ **Accessibility First** - Complete dynamic text scaling, brightness control, and screen reader support  
🎨 **Adaptive UI** - Full dark mode, high contrast, and customizable interface elements  
🔐 **Secure Authentication** - Working email/PIN authentication with local data storage

### 🆕 Latest Addition

- **Quick Voice Announcement Toggle** – Newly added control to instantly pause or resume global TTS announcements while preserving user preferences for future sessions.

### ✅ Recent Testing

- **TC: Voice Announcement Toggle On/Off** – Verified that toggling the global TTS switch immediately stops or resumes announcements (screen titles, buttons, and OCR text) and that the preference persists after navigation.

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
- **State Management**: React Context API
- **Database**: Supabase (PostgreSQL) with offline fallback to AsyncStorage
- **Storage**: AsyncStorage for local persistence and offline caching
- **Navigation**: Expo Router with Stack and Tab navigation

### Database

AccessAid uses Supabase as the primary cloud database with AsyncStorage as an offline cache. This hybrid approach ensures the app works seamlessly both online and offline.

**Database Architecture:**
- **Primary Storage**: Supabase (PostgreSQL) for cloud-based data persistence
- **Offline Cache**: AsyncStorage for local device storage
- **Sync Strategy**: Background sync to Supabase when online, automatic fallback to AsyncStorage when offline

**Database Tables:**
- **users**: User profiles, email, names, profile photos, and accessibility preferences
- **reminders**: User reminders with title, description, datetime, frequency, priority, category, and completion status
- **user_settings**: User accessibility settings (brightness, text zoom, voice speed, dark mode)
- **tts_history**: Text-to-speech usage logs for analytics

**Database Schema:**
The complete database schema is defined in `supabase-schema.sql`. This includes:
- Table definitions with proper data types and constraints
- Foreign key relationships for data integrity
- Row Level Security (RLS) policies ensuring users can only access their own data
- Indexes for optimized query performance
- Triggers for automatic timestamp updates

**Configuration:**
Supabase credentials should be stored in a `.env` file (not committed to version control) for security:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Alternatively, they can be stored in `app.json` under the `extra` section (not recommended for production):
```json
{
  "extra": {
    "supabaseUrl": "https://your-project.supabase.co",
    "supabaseAnonKey": "your-anon-key"
  }
}
```

**Important Security Note**: Never commit API keys to version control. Use environment variables (`.env` file) instead. See `ENV_SETUP.md` and `SECURITY.md` for detailed setup instructions.

**Setup Instructions:**
1. Create a Supabase account at https://supabase.com
2. Create a new project in your Supabase dashboard
3. Get your Project URL and anon/public key from Settings > API
4. Add credentials to `app.json` as shown above
5. Run the SQL schema from `supabase-schema.sql` in the Supabase SQL Editor
6. Restart your Expo development server

**How It Works:**
- When Supabase is configured and the app is online, all data operations sync to the cloud database
- Data is always saved to AsyncStorage first for immediate availability
- Background sync to Supabase happens automatically without blocking the UI
- If Supabase is unavailable or not configured, the app continues to work using AsyncStorage only
- On app launch, data is loaded from Supabase if available, otherwise from AsyncStorage
- This ensures users can access their data even without an internet connection

**Service Layer:**
The database operations are handled through `services/supabaseService.ts`, which provides:
- User authentication (sign up, sign in, sign out) with PIN support
- User profile management (create, read, update)
- Reminders CRUD operations (create, read, update, delete)
- Settings management (get, update)
- TTS history logging
- Automatic offline fallback for all operations

**Security:**
- Row Level Security (RLS) is enabled on all tables
- Users can only access and modify their own data
- Authentication is required for all database operations
- API keys are safely stored in app configuration

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

### 📸 AI Reader quick start
- Open the Home screen and scroll to **AI Reader**.
- Choose **Take Picture**, **Upload Image**, or **Upload File**.
- Wait for **Processing...**, then the extracted text appears in the **Extracted Text** area and can be read aloud.

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

#### API Integration
- RESTful API service layer with offline fallback support
- Mock data fallback for offline functionality
- Full CRUD operations for all entities
- API health check endpoint

#### Database Integration
- Supabase cloud database integration for online data storage
- Automatic background sync to cloud database
- AsyncStorage offline cache for seamless offline functionality
- Hybrid storage strategy ensuring data availability in all network conditions
- User authentication with Supabase Auth
- Row Level Security (RLS) policies for data protection
- Complete database schema with tables for users, reminders, settings, and TTS history

---

### Sprint 3: Major Feature Implementations ✅

**Goal**: Implement advanced accessibility features including enhanced camera OCR with safety checks, comprehensive speech-to-text capabilities, and global voice announcement controls for improved user experience.

**Completed**:

#### 📸 Camera Reader Module (OCR + TTS)
- Enhanced camera integration for capturing text from photos
- OCR text extraction and display in large, readable font
- Safety checks for low-light and blurry images with "Retake Photo" prompts
- Seamless integration with Text-to-Speech system

#### 🎙️ Speech-to-Text (Voice Input)
- Comprehensive voice input capabilities across the application
- Users can speak instead of typing for reminders, form fields, and general input
- Enhanced accessibility for users with motor challenges or keyboard difficulties

#### 🔊 Voice Announcement Toggle (Global TTS Switch)
- Centralized control for all Text-to-Speech features
- Toggle voice announcements for screen titles, button labels, and OCR-extracted text
- Smart audio management to prevent conflicts between STT and TTS
- Persistent user preferences saved across app sessions

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
The API key should be stored in a `.env` file (not committed to version control) for security:
```bash
EXPO_PUBLIC_OCR_SPACE_API_KEY=your-api-key-here
```

Alternatively, it can be stored in `app.json` under the `extra` section (not recommended for production):
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
4. Add the key to `.env` file (see `ENV_SETUP.md` for details)
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

### 2. Supabase Database (Cloud Database)

**Purpose**: Cloud-based PostgreSQL database for user data, reminders, settings, and TTS history with automatic sync and offline support.

**Description**:
Supabase provides a fully managed PostgreSQL database with real-time capabilities, authentication, and Row Level Security. AccessAid uses Supabase for cloud data storage while maintaining full offline functionality through AsyncStorage caching.

**Database Features**:
- PostgreSQL database with automatic backups
- Real-time data synchronization
- Row Level Security (RLS) for data protection
- Built-in authentication system
- RESTful API auto-generated from database schema
- Automatic indexing for query optimization

**Database Operations**:
All database operations are handled through `services/supabaseService.ts`:
- User authentication (sign up, sign in, sign out) with email and PIN
- User profile management (create, read, update)
- Reminders CRUD operations (create, read, update, delete)
- Settings management (get, update individual settings)
- TTS history logging and retrieval

**Offline Support**:
The app implements a hybrid storage strategy:
- All data operations first save to AsyncStorage (immediate availability)
- Background sync to Supabase when online (non-blocking)
- Automatic fallback to AsyncStorage when Supabase is unavailable
- Data syncs automatically when connection is restored
- Users can access all features without internet connection

**Configuration**:
Supabase credentials are stored in `app.json`:
```json
{
  "extra": {
    "supabaseUrl": "https://your-project.supabase.co",
    "supabaseAnonKey": "your-anon-key"
  }
}
```

**Database Schema**:
The complete schema is defined in `supabase-schema.sql`:
- Tables: users, reminders, user_settings, tts_history
- Foreign key relationships for data integrity
- RLS policies for security
- Indexes for performance
- Triggers for automatic timestamp updates

**Code Locations**:
- Supabase Client: `services/supabase.ts`
- Database Service: `services/supabaseService.ts`
- Database Schema: `supabase-schema.sql`
- Integration: `src/contexts/AppContext.tsx`

### 3. AccessAid API Service (Frontend)

**Purpose**: API service layer for user data management, reminders, settings, and TTS history with offline support.

**Description**:
A TypeScript API service that handles all backend communication for AccessAid. The service includes offline fallback mechanisms using mock data when the backend is unavailable.

**Base URL**: `http://192.168.0.220:8000/api` (configurable via `services/api.ts`)

**API Endpoints**:

#### Health Check
- **GET** `/health` - API health check endpoint
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

**Offline Support**:
The frontend includes offline fallback mechanisms. When the backend API is unavailable:
- Mock data is used automatically
- User operations continue with local storage (AsyncStorage)
- Data persists locally until connection is restored

**Code Location**:
- Frontend API Service: `services/api.ts`

---

### API Integration Summary

| API | Type | Purpose | Status |
|-----|------|---------|--------|
| OCR.Space | External | Text extraction from images/PDFs | Active |
| Supabase | Cloud Database | User data, reminders, settings storage | Active |
| AccessAid API Service | Frontend | User data & app features | Active |

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
