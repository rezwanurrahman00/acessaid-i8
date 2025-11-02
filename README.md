# AccessAid

Modern Expo (React Native) app focused on assistive technology and accessibility.

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

### Tech (provisional)
- Frontend: React Native (Expo)
- Backend: FastAPI (Python) or Node/Express
- Database: PostgreSQL
- Cloud/Deploy: Heroku/AWS
- AI/ML: Python (scikit-learn / lightweight on-device models)

### Repo Conventions
- Branches: `main` (protected), `dev`, feature branches `feat/<name>`
- Pull Requests: reviewed before merge
- Issues: tagged with `feature`, `bug`, `priority`
- Commits: Conventional Commits (e.g., `feat(ui): add accessibility toggle`)

### Sprint 0 Checklist
- Define target disability group
- Competitive scan (existing tools)
- Select MVP features (2–3)
- Wireframes & accessibility spec (WCAG 2.2)
- Architecture diagram & tech stack decision
- Repo + CI boilerplate
- Trello board and working agreements

Notes:
- Reference commit: `af9a74f87a4f88ee62df68d11992d348ef38c3e3`

---

## Current App Highlights
- Sign In / Sign Up with per-user persisted data
- Profile with photo picker and saved preferences
- Voice commands with debounce/cooldown and TTS feedback
- Per-user data isolation and modern UI with subtle background logo

## Scripts
- `npm start` – Start the Expo dev server
- `npm run android` – Run on Android emulator/device
- `npm run ios` – Run on iOS simulator/device (macOS)
- `npm run web` – Run the web build

## License
© Code Innovators. All rights reserved.
