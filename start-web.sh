#!/bin/bash

echo "🚀 Starting AccessAid Web Server..."
echo "📱 This will open the app in your web browser"
echo ""

# Kill any existing Expo processes
pkill -f "expo start" 2>/dev/null || true

# Start the web server
npx expo start --web --port 3000 --host localhost

echo ""
echo "✅ AccessAid is now running!"
echo "🌐 Open your browser and go to: http://localhost:3000"
echo "📱 Or scan the QR code with Expo Go app on your phone"
