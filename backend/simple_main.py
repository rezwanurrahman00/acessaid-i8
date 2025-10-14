"""
Simplified FastAPI server for AccessAid backend.
This is a minimal version without database dependencies for testing.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="AccessAid API",
    description="Backend API for AccessAid accessibility app",
    version="1.0.0"
)

# Add CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your app's origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "AccessAid API is running!", "status": "healthy"}

@app.get("/api/health")
async def health_check():
    """Additional health check endpoint."""
    return {"status": "ok", "message": "Server is healthy"}

@app.get("/api/users")
async def get_users():
    """Get sample users."""
    return [
        {
            "user_id": 1,
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "accessibility_preferences": {
                "voice_speed": 1.0,
                "high_contrast": False,
                "large_text": False,
                "voice_navigation": True
            }
        }
    ]

@app.get("/api/users/{user_id}/reminders")
async def get_user_reminders(user_id: int):
    """Get sample reminders for a user."""
    return [
        {
            "reminder_id": 1,
            "title": "Sample Reminder",
            "description": "This is a sample reminder",
            "reminder_datetime": "2024-01-01T12:00:00",
            "frequency": "once",
            "priority": "medium",
            "is_active": True,
            "is_completed": False
        }
    ]

if __name__ == "__main__":
    print("Starting AccessAid API server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
