# AccessAid Authentication System

This guide explains the authentication system implemented in the AccessAid app.

## Features

### Sign In & Sign Up
- **Sign Up**: Create a new account with name, email, and password
- **Sign In**: Access your account with email and password
- **Form Validation**: All fields are required and validated
- **Error Handling**: Clear error messages for invalid credentials or existing accounts

### Profile Management
- **View Profile**: See your name, email, and profile picture
- **Edit Profile**: Update your name and profile picture
- **Profile Picture**: Add or change your profile picture using the device's photo library
- **Persistent Storage**: All changes are saved locally using AsyncStorage

### Navigation
- **Conditional Navigation**: Shows auth screen when not logged in, main app when logged in
- **Profile Tab**: Easy access to profile from the main navigation
- **Smooth Transitions**: Clean UI with smooth screen transitions

## Technical Implementation

### Authentication Context (`contexts/AuthContext.tsx`)
- Manages user state and authentication functions
- Handles sign in, sign up, sign out, and user updates
- Uses AsyncStorage for persistent local storage
- Provides loading states and error handling

### Screens
- **Auth Screen** (`app/auth.tsx`): Sign in and sign up form with toggle
- **Profile Screen** (`app/profile.tsx`): User profile management
- **Profile Tab** (`app/(tabs)/profile.tsx`): Profile screen in tab navigation

### Data Storage
- User data stored in AsyncStorage
- Separate storage for current user and all users
- Automatic data persistence across app sessions

## Usage

1. **First Time Users**: Sign up with name, email, and password
2. **Returning Users**: Sign in with email and password
3. **Profile Management**: Access profile tab to edit information
4. **Sign Out**: Use the sign out button in the profile screen

## Security Notes

- Passwords are stored in plain text (for demo purposes)
- In production, implement proper password hashing
- Consider adding additional security measures like biometric authentication

## Dependencies Added

- `@react-native-async-storage/async-storage`: Local data storage
- `expo-image-picker`: Profile picture selection

## File Structure

```
app/
├── auth.tsx                 # Sign in/Sign up screen
├── profile.tsx             # Profile management screen
├── _layout.tsx             # Root layout with auth provider
└── (tabs)/
    ├── profile.tsx         # Profile tab wrapper
    └── _layout.tsx         # Tab navigation with profile tab

contexts/
└── AuthContext.tsx         # Authentication context and provider
```

The authentication system is now fully integrated into the AccessAid app and ready for use!
