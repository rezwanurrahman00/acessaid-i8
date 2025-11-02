# AccessibilitySetupPopup Component

A professional, Apple-style accessibility setup popup for the AccessAid app that appears immediately after login to help users customize their accessibility preferences.

## 🎨 Design Features

### Apple-Style UI
- **Clean, minimal design** with soft white background and light gray separators
- **Rounded cards** with smooth shadow effects
- **San Francisco-style typography** with large, readable labels
- **Smooth animations** and haptic feedback throughout
- **Professional AccessAid logo** prominently displayed

### Visual Elements
- **Gradient backgrounds** for depth and visual appeal
- **Animated microphone icon** with pulse effect during voice listening
- **Wave animation** during voice recognition
- **Live preview text** that scales with text zoom settings
- **Value indicators** showing current settings (e.g., "75% • High")

## ⚙️ Settings Included

### 1. Display Brightness
- **Range**: 0-100% with live screen brightness updates
- **Voice Commands**: "Increase brightness", "Set brightness to medium", etc.
- **Visual Feedback**: Screen dims/brightens instantly as you adjust
- **Level Labels**: Low, Medium, High, Maximum

### 2. Text Size & Zoom
- **Range**: 80%-180% text scaling
- **Live Preview**: Sample text that scales in real-time
- **Voice Commands**: "Make text bigger", "Set text to large", etc.
- **Level Labels**: Small, Normal, Large, Extra Large

### 3. Voice Speed Control
- **Range**: 0.5x-2.0x speech rate
- **Test Button**: "Test Voice" to preview current speed
- **Voice Commands**: "Make voice faster", "Set voice to normal", etc.
- **Level Labels**: Slow, Normal, Fast

## 🗣️ Voice Control Features

### Voice Recognition
- **Microphone button** in top-right corner
- **Animated pulse effect** while listening
- **Wave animation** during voice recognition
- **Real-time feedback** with spoken confirmations

### Supported Commands
```
Brightness:
- "Increase brightness" / "Make it brighter"
- "Decrease brightness" / "Make it dimmer"
- "Set brightness to medium/high/low/maximum"

Text Size:
- "Make text bigger" / "Increase text size"
- "Make text smaller" / "Decrease text size"
- "Set text to normal/large/small"

Voice Speed:
- "Make voice faster" / "Speed up voice"
- "Make voice slower" / "Slow down voice"
- "Set voice to normal"
```

## 🎯 Interactive Features

### Live Updates
- **Brightness**: Screen brightness changes instantly
- **Text Zoom**: Preview text scales in real-time
- **Voice Speed**: Test button uses current speed setting

### Haptic Feedback
- **Light haptic** on slider adjustments
- **Medium haptic** on button presses
- **Success haptic** on save completion

### Animations
- **Fade-in/fade-out** for popup appearance
- **Slide-up animation** for smooth entry
- **Pulse animation** for microphone during listening
- **Wave effect** during voice recognition

## 💾 Save & Preview

### Preview Settings
- **Live application** of all settings
- **Voice preview** with current speed
- **Temporary brightness** adjustment
- **3-second preview** with automatic restoration

### Save & Continue
- **Permanent save** of all preferences
- **Success feedback** with haptic and voice
- **Navigation** to next screen
- **Final settings** applied to device

## 🧩 Technical Implementation

### Dependencies Used
```typescript
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import * as Brightness from 'expo-brightness';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibilitySlider } from './AccessibilitySlider';
import { ModernButton } from './ModernButton';
```

### Props Interface
```typescript
interface AccessibilitySetupPopupProps {
  visible: boolean;
  onSave: (settings: {
    brightness: number;
    textZoom: number;
    voiceSpeed: number;
  }) => void;
  onClose: () => void;
}
```

### State Management
- **Local state** for current settings
- **Animation values** for smooth transitions
- **Voice recognition** state management
- **Preview mode** state handling

## 🎨 Styling

### Color Scheme
- **Primary**: #4A90E2 (AccessAid blue)
- **Success**: #66BB6A (green)
- **Warning**: #FFA726 (orange)
- **Error**: #FF6B6B (red)
- **Background**: White with subtle gradients
- **Text**: #1A1A1A (dark gray)

### Typography
- **Title**: 24px, bold, system font
- **Labels**: 18px, semibold
- **Descriptions**: 14px, regular
- **Values**: 14px, medium with colored background

### Spacing & Layout
- **Card padding**: 20px
- **Card margins**: 16px between cards
- **Button spacing**: 12px gap
- **Icon sizes**: 24px for settings, 20px for buttons

## 🚀 Usage Example

```typescript
import { AccessibilitySetupPopup } from './AccessibilitySetupPopup';

const MyComponent = () => {
  const [showSetup, setShowSetup] = useState(false);

  const handleSave = (settings) => {
    console.log('Settings saved:', settings);
    setShowSetup(false);
  };

  return (
    <AccessibilitySetupPopup
      visible={showSetup}
      onSave={handleSave}
      onClose={() => setShowSetup(false)}
    />
  );
};
```

## ✨ Key Features

1. **Professional Design**: Apple-style UI with clean, modern aesthetics
2. **Voice Control**: Full voice command support for hands-free operation
3. **Live Preview**: Real-time updates as you adjust settings
4. **Haptic Feedback**: Tactile responses for all interactions
5. **Smooth Animations**: Polished transitions and micro-interactions
6. **Accessibility First**: Designed specifically for accessibility needs
7. **Easy Integration**: Simple props interface for any React Native app

## 🎯 Perfect For

- **Accessibility apps** requiring user preference setup
- **iOS-style interfaces** in React Native
- **Voice-controlled applications**
- **Apps with multiple accessibility settings**
- **Professional, polished user experiences**

The AccessibilitySetupPopup provides a complete, production-ready solution for accessibility preference setup with a beautiful, Apple-inspired design and comprehensive voice control capabilities.
