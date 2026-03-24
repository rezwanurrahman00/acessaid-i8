# AccessAid ♿

AccessAid is a React Native accessibility app built for persons with disabilities. It combines voice control, camera OCR, smart reminders, and an adaptive UI to make everyday tasks easier — all built to WCAG 2.2 AA standards.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Auth** | Email + 4-digit PIN sign-up/sign-in via Supabase Auth |
| ⏰ **Smart Reminders** | Full CRUD with categories, priorities, recurrence, real-time push notifications, and offline sync |
| 📸 **Camera OCR** | Capture or upload images/PDFs and extract text using OCR.space API |
| 🎤 **Voice Commands** | Keyword-based voice command system with NLP reminder creation |
| 🎙️ **Voice Input** | Speak into any text field instead of typing (dev build only) |
| 🔊 **TTS** | Full Text-to-Speech with adjustable speed and global toggle |
| ♿ **Accessibility** | Dynamic text zoom, brightness control, improved dark mode, haptic feedback, screen reader support |
| 🌐 **Community (Go Public)** | Opt-in public profile with disability tags, discover other users, send/receive connection requests, and real-time chat |
| 👋 **Onboarding** | 5-slide animated walkthrough shown once after sign-up, introducing every key feature |
| 🤖 **AI Health Assistant** | Groq/Llama-powered chat assistant for health, medication, and disability rights questions |
| 💚 **Daily Check-Ins** | Log mood, pain, and energy daily; data stored in Supabase for health history |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 54) + TypeScript |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| Backend / Auth | Supabase (PostgreSQL + RLS + Auth) |
| Notifications | expo-notifications (scheduled, cancellable, persisted) |
| Offline Sync | AsyncStorage queue (`src/utils/syncQueue.ts`) |
| OCR | OCR.space REST API |
| State | React Context API |
| Voice | expo-speech (TTS), expo-speech-recognition (STT) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm
- [Expo Go](https://expo.dev/go) on your phone (for basic testing)
- Android Studio or Xcode for a full dev build (required for voice input and OCR)

### 1. Clone and install

```bash
git clone <repo-url>
cd acessaid-i8
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=        # get from team or your own Supabase project
EXPO_PUBLIC_SUPABASE_ANON_KEY=   # get from team or your own Supabase project
EXPO_PUBLIC_OCR_SPACE_API_KEY=   # free key from https://ocr.space/ocrapi
```

> `EXPO_PUBLIC_API_BASE_URL` is for the legacy Python backend which is no longer used. You can ignore it.

### 3. Run the app

```bash
npx expo start --clear
```

Scan the QR code with Expo Go. For full features (voice input, OCR) use a dev build:

```bash
# Android
npx expo run:android

# iOS (macOS only)
npx expo run:ios
```

### Feature support by run method

| Feature | Expo Go | Dev Build |
|---|---|---|
| Auth, reminders, profile | ✅ | ✅ |
| Push notifications | ✅ | ✅ |
| TTS / voice announcements | ✅ | ✅ |
| Voice commands | ✅ | ✅ |
| **Voice input (mic → text)** | ❌ | ✅ |
| **Camera OCR** | ❌ | ✅ |

---

## 🗄 Setting Up Your Own Supabase

If you want a fully independent instance instead of using the shared project:

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Auth → Providers → Email** and **disable "Confirm email"**
3. Run this SQL in the **SQL Editor**:

```sql
CREATE TABLE reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reminder_datetime TIMESTAMPTZ NOT NULL,
  frequency TEXT DEFAULT 'once',
  priority TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminders" ON reminders
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);
```

4. Copy your **Project URL** and **anon key** from **Settings → API** into your `.env`

---

## 🔌 APIs

### OCR.space

**Purpose**: Extract text from images and PDFs captured or uploaded by the user.

- **Endpoint**: `POST https://api.ocr.space/parse/image`
- **Auth**: API key via `EXPO_PUBLIC_OCR_SPACE_API_KEY` in `.env`
- **Supported formats**: JPEG, PNG, GIF, BMP, PDF
- **Free tier**: 25,000 requests/month
- **Get a key**: [ocr.space/ocrapi](https://ocr.space/ocrapi)
- **Code location**: `src/screens/HomeScreen.tsx` → `extractTextWithOCRSpace()`

### Supabase

**Purpose**: Authentication, database (reminders + profiles), and Row Level Security.

- **Auth**: Email + PIN (padded to meet 6-char minimum)
- **Tables**: `reminders`, `profiles`, `social_profiles`, `connections`, `messages`
- **RLS**: Enabled — users can only access their own data
- **Realtime**: Enabled on `messages` and `connections` for live chat and connection updates
- **Client**: `lib/supabase.ts`
- **Offline**: All writes are queued in `src/utils/syncQueue.ts` when Supabase is unreachable and replayed on reconnect

---

## 🗂 Legacy Backend (Reference Only)

The `backend/` folder contains the original Python/FastAPI server built during Sprint 2. It is **no longer called by the app** — the frontend migrated fully to Supabase. The code is kept in the repo for reference and grading purposes.

### Why it was replaced

The FastAPI backend required every developer to run a local Python server and configure a database, which made onboarding slow and complicated testing on physical devices. Supabase removed that friction entirely — auth, database, and RLS are all managed in the cloud with zero server setup.

### What it was

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 + Uvicorn |
| ORM | SQLAlchemy 2.0 |
| Database | SQLite (dev) → MySQL 8 (intended prod) |
| Auth | JWT via python-jose + bcrypt (passlib) |
| ML | scikit-learn, numpy, pandas |
| Server-side TTS | pyttsx3 |

### Database models

| Model | Purpose |
|---|---|
| `User` | User accounts with accessibility preferences (JSON field) |
| `Reminder` | Reminders with title, datetime, frequency, priority |
| `Task` | Task management with status and due dates |
| `Notification` | Notification tracking per reminder (SMS, email, voice, push) |
| `TTSHistory` | Log of every TTS conversion with speech rate and duration |
| `UserSettings` | Per-user key/value app settings |
| `DeviceSync` | Multi-device sync state and platform tracking |
| `MLModel` | Metadata for stored ML model versions and accuracy scores |
| `AccessibilityLog` | Per-session log of which accessibility features were used |

### Frontend service

`services/api.ts` is the corresponding frontend API client. It is **not imported anywhere** in the active `src/` code — it exists solely as a reference alongside the backend.

### Running it locally (optional)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in DB credentials
python setup_database.py      # creates tables
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs are available at `http://localhost:8000/docs` once running.

---

## 👥 Project Info

**Project**: AccessAid – I-8
**Team**: Code Innovators
**Course**: Capstone

### Team Members
- Gautam Aryal (@Aryalgautam1)
- Allen Pandey (@Allenpandey1)
- Aasmi Joshi (@aasjos)
- Sworup Bohara (@sb2933)
- Rezwanur Rahman (@rezwanurrahman00)

### Repo Conventions
- Branches: `main` (protected), `dev`, feature branches `feat/<name>`
- Pull Requests: reviewed before merge
- Issues: tagged with `feature`, `bug`, `priority`
- Commits: Conventional Commits (`feat(ui): add accessibility toggle`)

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

### Sprint 4: Camera Reader & Reminder Integration ✅

**Goal**: Polish the Camera Reader UI and enable seamless conversion of OCR-extracted text into reminders.

**Completed**:

#### 📸 Camera Reader UI Redesign
- Redesigned Camera Reader layout with improved spacing, contrast, and button styling
- Enhanced visual hierarchy for capture, upload, and file import actions
- Cleaner extracted text display area with better readability

#### 📝 Extracted Text to Reminder
- Added the ability to directly create a reminder from OCR-extracted text
- Users can scan or upload a document and instantly convert the extracted text into a new reminder
- Streamlined workflow from text extraction to reminder creation without manual copy-paste

---

### Sprint 5: Community Feature & Dark Mode Polish ✅

**Goal**: Add an opt-in social layer so users can connect with others who share similar accessibility needs, allowing them to chat, share tips, advice, and personal experiences. This feature would help users learn from each other, offer support, and build a small community within the app.

Additionally, polish dark mode across the full app so that every screen, button, and menu is visually comfortable and accessible, providing a consistent experience for users who prefer dark mode.
**Completed**:

#### Database Migration — Legacy to Supabase
- Replaced the local Python/FastAPI server and SQLite database with Supabase, moving all data to a cloud-hosted PostgreSQL database so the app works for any user without requiring a locally running server
- Authentication was migrated from manual JWT tokens and bcrypt password hashing to Supabase Auth, which handles sign-up, sign-in, and session management out of the box
- Row Level Security (RLS) policies were applied to all tables so users can only read and write their own data, enforced at the database level rather than in application code
- Three new tables were added to support the community feature: `social_profiles` (public profile and disability tags), `connections` (connection requests and accepted connections), and `messages` (chat history between connected users)
- Supabase Realtime was enabled on the `messages` and `connections` tables so chat messages and connection updates are pushed to the app instantly without polling

#### 🌐 Community — Go Public Profile
- New **Community** section at the bottom of the Profile tab
- **Go Public toggle** — users opt-in to make their profile visible in the community
- **Disability tags** — users select tags (e.g. Visual, Hearing, Motor, Cognitive) to describe their needs
- **Discover screen** — browse other public profiles card by card; send a Connect or Skip
- **Connections & Requests** — view accepted connections and manage incoming requests (accept / decline)
- **Real-time Chat** — message any accepted connection via Supabase Realtime subscriptions
- All community data stored in `social_profiles`, `connections`, and `messages` Supabase tables with RLS

#### 🌙 Dark Mode Improvements
- Consistent dark theme applied across all tabs and modals
- Color tokens in `constants/theme.ts` refined for better contrast in dark mode
- All community components (Discover, Connections, Chat modals) fully support light and dark themes
- Accessibility settings (brightness, text zoom) continue to work correctly alongside dark mode

#### 🔴 SOS Button
- Floating SOS button rendered on top of all screens, always accessible regardless of current tab
- Draggable — users can reposition the button anywhere on screen; position is saved via AsyncStorage and restored on next launch
- Tapping the button opens a confirmation modal with a 3-second auto-countdown before placing the call
- TTS announces the emergency contact name and countdown duration when the modal opens
- Haptic feedback on trigger and cancellation
- Displays emergency contact name, relationship, and phone number in the confirmation modal
- Auto-calls the saved emergency contact phone number on countdown expiry; falls back to 911 if no contact is set
- Cancel button stops the countdown and dismisses the modal at any point
- Call Now button immediately places the call without waiting for the countdown
- Emergency contact details are pulled from the user profile (name, phone, relationship)

---
### Sprint 6: Onboarding Experience & AI Assistant ✅

**Goal**: Introduce new users to the app with a polished onboarding walkthrough, add a dedicated AI health assistant powered by Groq/Llama, and improve daily check-in tracking.

**Completed**:

#### 👋 Onboarding Walkthrough
- Added 5-slide onboarding screen shown once after first sign-up
- Each slide introduces a key feature: Welcome, Smart Reminders, AI Assistant, Daily Check-Ins, Community
- Slide 1 includes a feature icon strip (Reminders, AI Chat, Check-ins, Community) for a quick overview
- Animated fade transitions between slides with haptic feedback on each step
- Skip button top-right for users who want to jump straight in
- Progress dots at the bottom indicate current slide position
- Dispatches `COMPLETE_ONBOARDING` action on finish; state persisted in AsyncStorage so it only shows once
- Navigation flow updated: Login → Onboarding → Accessibility Setup → Main App

#### 🤖 AI Health Assistant Tab
- New dedicated **Assistant** tab powered by Groq REST API (`llama-3.3-70b-versatile`)
- ChatGPT-style UI: user bubbles on the right, AI responses on the left with no background bubble
- Animated 3-dot typing indicator while the AI is generating a response
- Welcome screen with 4 quick-prompt cards shown before the first message
- Voice command support: say "clear chat" or "new chat" to reset the conversation
- System prompt tailored specifically for health, medication, and disability rights questions

#### 💚 Daily Check-In Screen
- Standalone Check-In tab for logging daily mood, pain level, and energy
- Data stored in Supabase `check_ins` table with full RLS
- Voice command: say "save check in" to submit the form hands-free

---
### Sprint 7: Performance Optimization & Network Reliability ✅

**Goal**: Enhance performance optimization for real-time cloud interactions by adding network-aware sync management and offline/online user feedback.

**Completed**:

#### 🌐 Network Monitoring & Auto-Sync
- Added `NetworkMonitor` utility (`src/utils/networkMonitor.ts`) that watches device connectivity in real time using `@react-native-community/netinfo`
- Automatically flushes the offline sync queue (`syncQueue.ts`) the moment internet is restored — no manual action needed from the user
- Singleton pattern ensures the monitor runs once across the entire app lifecycle

#### 📴 Offline/Online Status Banner
- Added `NetworkBanner` component (`src/components/NetworkBanner.tsx`) that slides in at the top of the screen when connectivity changes
- Shows a **red banner** with a message when the device goes offline
- Shows a **green banner** confirming reconnection and sync, then auto-hides after 2.5 seconds
- Fully accessible with `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"`
- Integrated into `App.tsx` so it appears across every screen automatically

---

## 📜 Scripts

```bash
npm start              # Start Expo dev server (Expo Go — limited features)
npm run android        # Dev build on Android device/emulator (full features)
npm run ios            # Dev build on iOS device/simulator (macOS only)
npm run web            # Web build (notifications and native modules not available)
npx expo start --clear # Start with Metro cache cleared (use when seeing stale behaviour)
```

---

## License

© Code Innovators. All rights reserved.
