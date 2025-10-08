#!/usr/bin/env python3
"""
Quick database test script for AccessAid.
This is a simplified test to quickly verify the database is working.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db, create_tables
from database.models import User
from database.seed_data import seed_database


def quick_test():
    """Quick test to verify database is working."""
    print("🚀 Quick Database Test for AccessAid...\n")
    
    try:
        # 1. Create tables
        print("1. Creating database tables...")
        create_tables()
        print("   ✅ Tables created successfully!")
        
        # 2. Seed with sample data
        print("\n2. Seeding database with sample data...")
        seed_database()
        print("   ✅ Sample data created successfully!")
        
        # 3. Test basic query
        print("\n3. Testing basic database query...")
        db = next(get_db())
        users = db.query(User).all()
        print(f"   ✅ Found {len(users)} users in database")
        
        # 4. Show sample data
        print("\n4. Sample data overview:")
        for user in users:
            print(f"   👤 {user.first_name} {user.last_name} ({user.email})")
            print(f"      - Voice speed: {user.accessibility_preferences.get('voice_speed', 'N/A')}")
            print(f"      - High contrast: {user.accessibility_preferences.get('high_contrast', 'N/A')}")
            print(f"      - Reminders: {len(user.reminders)}")
            print(f"      - Settings: {len(user.user_settings)}")
            print(f"      - Devices: {len(user.device_sync)}")
        
        print(f"\n🎉 Database is working correctly!")
        print(f"📊 Total records created:")
        print(f"   - Users: {len(users)}")
        print(f"   - Tasks: {sum(len(user.tasks) for user in users)}")
        print(f"   - Reminders: {sum(len(user.reminders) for user in users)}")
        print(f"   - Notifications: {sum(len(user.notifications) for user in users)}")
        print(f"   - TTS History: {sum(len(user.tts_history) for user in users)}")
        print(f"   - User Settings: {sum(len(user.user_settings) for user in users)}")
        print(f"   - Device Syncs: {sum(len(user.device_sync) for user in users)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        if 'db' in locals():
            db.close()


if __name__ == "__main__":
    success = quick_test()
    if success:
        print("\n✅ Ready to start development!")
    else:
        print("\n❌ Please fix the errors above before continuing.")
    sys.exit(0 if success else 1)
