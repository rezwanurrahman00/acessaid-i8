# 📱 Expo Notifications Setup Guide

## 🚨 Current Limitation

**Expo Go** doesn't fully support `expo-notifications` due to native module limitations. This guide provides solutions for testing notifications properly.

## 🔧 Solutions

### Option 1: Development Build (Recommended)

#### Step 1: Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

#### Step 2: Login to Expo
```bash
eas login
```

#### Step 3: Configure EAS
```bash
eas build:configure
```

#### Step 4: Create Development Build
```bash
# For iOS
eas build --profile development --platform ios

# For Android
eas build --profile development --platform android

# For both platforms
eas build --profile development --platform all
```

#### Step 5: Install Development Build
1. Download the build from the EAS dashboard
2. Install on your device (iOS: via TestFlight, Android: via APK)
3. Run your app with: `npx expo start --dev-client`

### Option 2: Local Development Build

#### For iOS (macOS only):
```bash
npx expo run:ios
```

#### For Android:
```bash
npx expo run:android
```

### Option 3: Expo Dev Client

#### Install Dev Client:
```bash
npx expo install expo-dev-client
```

#### Create Development Build:
```bash
npx expo run:ios
# or
npx expo run:android
```

## 🛠️ Current Fallback System

The app now includes a **fallback notification system** that works in Expo Go:

### Features:
- ✅ **Haptic Feedback**: Vibrates when notifications should trigger
- ✅ **Text-to-Speech**: Speaks notification content aloud
- ✅ **Visual Alerts**: Shows browser alerts on web
- ✅ **Graceful Degradation**: App continues to work without native notifications

### How It Works:
1. **Detection**: Automatically detects if running in Expo Go
2. **Fallback**: Uses haptics + speech instead of native notifications
3. **Storage**: Stores notifications for later processing
4. **Compatibility**: Works seamlessly with existing code

## 📋 Testing Notifications

### In Expo Go (Current):
- ✅ Haptic feedback works
- ✅ Text-to-speech works
- ✅ Visual alerts work
- ❌ Native notifications don't work

### In Development Build:
- ✅ Full native notifications
- ✅ Background processing
- ✅ Proper permission handling
- ✅ Platform-specific features

## 🔍 Debugging

### Check Notification Support:
```javascript
import { notificationManager } from './src/utils/notificationManager';

console.log('Notifications supported:', notificationManager.isNotificationSupported());
console.log('Permission granted:', notificationManager.isPermissionGranted());
```

### View Console Logs:
- Open browser dev tools (F12)
- Check console for notification status messages
- Look for "Notifications not supported in Expo Go" warnings

## 🚀 Production Deployment

### For App Store/Play Store:
1. Create production build with EAS:
   ```bash
   eas build --profile production --platform all
   ```
2. Submit to app stores
3. Notifications will work fully in production

### For Web Deployment:
- Current fallback system works perfectly
- No additional configuration needed

## 📱 Platform-Specific Notes

### iOS:
- Requires notification permissions
- Background app refresh must be enabled
- TestFlight builds work for testing

### Android:
- Requires notification permissions
- Battery optimization may affect notifications
- Development builds work for testing

### Web:
- Uses fallback system (alerts + speech)
- No native notification support
- Perfect for development and testing

## 🔧 Troubleshooting

### Common Issues:

1. **"Notifications not supported" warning**:
   - Normal in Expo Go
   - Use development build for full functionality

2. **Permission denied**:
   - Check device settings
   - Re-request permissions in app

3. **Notifications not showing**:
   - Check if app is in background
   - Verify notification settings
   - Test with immediate notifications first

### Debug Commands:
```bash
# Check Expo version
npx expo --version

# Check installed packages
npx expo install --check

# Clear cache
npx expo start --clear
```

## 📚 Additional Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Development Builds Guide](https://docs.expo.dev/development/introduction/)
- [Expo Dev Client](https://docs.expo.dev/development/build/)

## ✅ Current Status

- ✅ **Fallback system implemented**
- ✅ **Graceful degradation working**
- ✅ **Development build ready**
- ✅ **Production deployment ready**

Your app now handles notifications properly in all environments! 🎉
