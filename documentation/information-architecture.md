# Information Architecture (IA)

## 1. App Overview
AccessAid is a mobile app that converts user-entered text into speech using Text-to-Speech (TTS). The app is designed to be **accessible, simple, and easy to navigate** for all users. This document describes the real layout, structure, and flow of the app.

---

## 2. App Screens

### 2.1 Home Screen
- **Purpose:** Main interface for TTS functionality. Users type text and play audio.  
- **Layout & Elements:**
  - **Text Input Box:** Large field where users type text. Supports multi-line input and font scaling.  
  - **Play TTS Button:** Positioned below the input box. Plays the typed text. Button label: `"Play Text"` (screen reader accessible).  
  - **History List:** Shows previously converted texts. Users can tap an entry to replay it.  
- **Accessibility Notes:** Buttons and list items have descriptive labels. Touch targets are at least 44x44 pixels. Logical tab order for screen readers.

### 2.2 Settings Screen
- **Purpose:** Customize app and accessibility options.  
- **Layout & Elements:**
  - **Speech Settings:** Adjust voice type and speech rate.  
  - **Accessibility Options:** Toggle **high-contrast mode**, **dark mode**, and **text size scaling**.  
  - **Other Preferences:** Enable or disable notifications.  
- **Accessibility Notes:** Toggle switches and input fields are labeled for screen readers. Layout is simple and grouped logically.

### 2.3 About Screen
- **Purpose:** Provides information about the app and help resources.  
- **Layout & Elements:**
  - **App Info:** Version number, developer details, short app description.  
  - **Help & Support:** Frequently asked questions, basic usage instructions.  
- **Accessibility Notes:** Use headings for sections. Text is readable and screen reader-friendly.

---

## 3. Screen Flow Diagram
The actual user flow in the app:


- Users start on the **Home screen**.  
- Navigate to **Settings** to change preferences or accessibility options.  
- Navigate to **About** for information and help.  
- Users can always return to Home easily via the bottom navigation bar.  
- Accessibility features (screen readers, high-contrast mode, font scaling) are **applied consistently across all screens**.

---

## 4. Navigation & Interaction
- **Bottom Navigation Bar:** Home | Settings | About. Each tab has a descriptive accessibility label.  
- **Focus Order:** Interactive elements are navigable in a logical sequence.  
- **Touch Targets:** Buttons and list items meet minimum size requirements.  
- **Feedback:** Buttons and TTS actions provide visual or auditory feedback.

---

## 5. Layout & Content Organization
- **Home:** Input, TTS button, history list. Clearly separated for ease of use.  
- **Settings:** Accessibility and user preferences grouped logically.  
- **About:** Info and help sections clearly separated.  
- **Design Consistency:** Same font, spacing, and colors across screens.

---

## 6. Recommendations
- Keep frequently used features (TTS, history) easy to access on Home.  
- Test IA with real users, including users with disabilities.  
- Maintain consistent layout, color contrast, and labeling.  
- Ensure screen readers can navigate all content properly.  
- Include helpful tooltips or instructions for less obvious features.

---