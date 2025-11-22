# AccessAid ♿

AccessAid is a comprehensive React Native application designed to enhance daily accessibility for persons with disabilities. Built with modern accessibility standards (WCAG 2.2 AA compliance), the app features voice control, camera OCR, smart reminders, and adaptive UI components.

## ✨ Key Features

🎤 **Voice Control** - Basic voice command framework with screen announcements and TTS feedback   
📸 **Camera OCR** - Camera integration ready (OCR API configuration required)  
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

```bash
npx expo start
```

From the Expo CLI, you can open the app in:
- A development build
- Android emulator
- iOS simulator
- Expo Go (sandboxed)

When you’re ready for a fresh start:

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

#### 📂 Code Organization
- TypeScript throughout for type safety
- Context API for state management (AppContext, AuthContext)
- Organized component and screen architecture
- Service layer abstractions
- Comprehensive error handling

---

## 📋 Current Status

The app is now functional with all Sprint 2 features implemented. The foundation established in Sprint 1 has been expanded with core accessibility features, authentication, voice commands, and a complete backend API.

## Scripts
- `npm start` – Start the Expo dev server
- `npm run android` – Run on Android emulator/device
- `npm run ios` – Run on iOS simulator/device (macOS)
- `npm run web` – Run the web build

## License
© Code Innovators. All rights reserved.
