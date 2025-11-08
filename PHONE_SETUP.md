# 📱 Running AccessAid on Your Phone

This guide covers different methods to run the AccessAid app on your phone, from development to production.

## 🚀 Quick Start - Method 1: Expo Go (Easiest for Development)

### Prerequisites
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Expo Go app** on your phone:
  - [Android: Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [iOS: App Store](https://apps.apple.com/app/expo-go/id982107779)

### Steps

1. **Install Dependencies**
   ```bash
   cd acessaid-i8
   npm install
   ```

2. **Start the Expo Development Server**
   ```bash
   npx expo start
   ```
   
   This will open a QR code in your terminal/command prompt.

3. **Connect Your Phone**
   - **Android**: Open Expo Go app → Scan QR code from terminal
   - **iOS**: Open Camera app → Scan QR code → Tap notification to open in Expo Go

4. **Important Notes for Expo Go**:
   - ✅ Works great for development and testing
   - ⚠️ Some features may be limited (notifications, camera OCR may not work fully)
   - ⚠️ Requires phone and computer on same Wi-Fi network
   - ⚠️ No standalone app file (.apk/.ipa)

---

## 🔧 Method 2: Development Build (Recommended for Full Features)

For full access to all features (camera, notifications, etc.), you need a development build.

### Prerequisites
- Same as Method 1, plus:
- **Expo CLI** (global installation)
  ```bash
  npm install -g expo-cli
  ```
- **EAS CLI** (for building)
  ```bash
  npm install -g eas-cli
  ```
- **Expo account** (free) - [Sign up here](https://expo.dev/signup)

### Steps for Android

1. **Install Dependencies**
   ```bash
   cd acessaid-i8
   npm install
   ```

2. **Build Development APK**
   ```bash
   eas build --profile development --platform android
   ```
   
   This will:
   - Create an Expo account if needed
   - Build the app in the cloud
   - Provide a download link for the APK file

3. **Install APK on Phone**
   - Download the APK from the link provided
   - Enable "Install from Unknown Sources" in Android settings
   - Install the APK file
   - Open the app - it will connect to your development server

4. **Start Development Server**
   ```bash
   npx expo start --dev-client
   ```

### Steps for iOS

1. **Build Development Build**
   ```bash
   eas build --profile development --platform ios
   ```
   
   Note: iOS builds require:
   - Apple Developer account ($99/year)
   - macOS computer (for Xcode)
   - Device registered in Apple Developer portal

2. **Install via TestFlight or Xcode**
   - Follow Expo's instructions for iOS development builds

---

## 📦 Method 3: Production Build (Standalone App)

For a standalone app that doesn't require Expo Go or development server.

### Android APK

1. **Configure EAS Build**
   ```bash
   eas build:configure
   ```

2. **Build Production APK**
   ```bash
   eas build --platform android --profile production
   ```

3. **Download and Install**
   - Download the APK from Expo dashboard
   - Install on Android device
   - App works independently (no development server needed)

### iOS IPA

1. **Build Production IPA**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Distribute via App Store or TestFlight**
   - Requires Apple Developer account
   - Follow App Store submission process

---

## 🔌 Method 4: Direct USB Connection (Android)

For Android devices connected via USB:

1. **Enable USB Debugging**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings → Developer Options
   - Enable "USB Debugging"

2. **Connect Phone via USB**
   ```bash
   # Check if device is detected
   adb devices
   ```

3. **Run on Connected Device**
   ```bash
   npm run android
   ```
   
   Or:
   ```bash
   npx expo run:android
   ```

---

## 📋 Required Permissions

The app requires these permissions on your phone:

### Android
- ✅ Camera (for OCR text reading)
- ✅ Microphone (for voice commands)
- ✅ Notifications (for reminders)
- ✅ Storage (for saving user data)
- ✅ Vibrate (for haptic feedback)

### iOS
- ✅ Camera (for OCR text reading)
- ✅ Microphone (for voice commands)
- ✅ Notifications (for reminders)
- ✅ Speech Recognition (for voice commands)

These permissions are automatically requested when you first use the features.

---

## 🌐 Network Requirements

### For Development (Expo Go / Development Build)
- **Phone and computer must be on the same Wi-Fi network**
- Or use tunnel mode: `npx expo start --tunnel` (slower but works on different networks)

### For Production Build
- **No network connection required** between phone and computer
- App works completely standalone

---

## 🛠️ Troubleshooting

### Issue: QR Code Not Scanning
- **Solution**: Try tunnel mode: `npx expo start --tunnel`
- Or manually enter URL shown in terminal

### Issue: "Unable to connect to development server"
- Check phone and computer are on same Wi-Fi
- Try restarting Expo server: `npx expo start --clear`
- Check firewall isn't blocking Expo ports

### Issue: Camera/Microphone Not Working
- Ensure permissions are granted in phone settings
- For Expo Go: Some features may not work - use development build instead
- Check `app.json` has correct permissions configured

### Issue: Notifications Not Working
- For Expo Go: Notifications are limited - use development build
- Ensure notification permissions are granted
- Check `NOTIFICATION_SETUP.md` for detailed setup

### Issue: Build Fails
- Check you have Expo account: `npx expo login`
- Verify `app.json` is properly configured
- Check EAS build logs for specific errors

---

## 📱 System Requirements

### Android
- **Minimum**: Android 6.0 (API level 23)
- **Recommended**: Android 10+ (API level 29+)
- **RAM**: 2GB minimum, 4GB+ recommended

### iOS
- **Minimum**: iOS 13.0
- **Recommended**: iOS 15.0+
- **Device**: iPhone 6s or newer

---

## 🎯 Recommended Setup for Testing

1. **Quick Testing**: Use Expo Go (Method 1)
2. **Full Feature Testing**: Use Development Build (Method 2)
3. **Final Distribution**: Use Production Build (Method 3)

---

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Go App](https://expo.dev/client)
- [React Native Setup](https://reactnative.dev/docs/environment-setup)

---

## ✅ Quick Checklist

Before running on phone:
- [ ] Node.js installed (v18+)
- [ ] Dependencies installed (`npm install`)
- [ ] Phone and computer on same Wi-Fi (for dev)
- [ ] Expo Go app installed (for Method 1)
- [ ] Permissions granted on phone (camera, microphone, notifications)
- [ ] Development server running (`npx expo start`)

---

**Need Help?** Check the [Expo forums](https://forums.expo.dev/) or [GitHub Issues](https://github.com/rezwanurrahman00/acessaid-i8/issues)


