#!/usr/bin/env python3
"""
Database testing script for AccessAid.
This script tests the database setup and verifies all models work correctly.
"""

import sys
import os
from datetime import datetime, timedelta

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db, create_tables, drop_tables, reset_database
from database.models import User, Task, Reminder, Notification, TTSHistory, UserSettings, DeviceSync, AccessibilityLog
from database.seed_data import seed_database
from sqlalchemy.orm import Session


def test_database_connection():
    """Test basic database connection."""
    print("🔌 Testing database connection...")
    try:
        db = next(get_db())
        # Simple query to test connection
        result = db.execute("SELECT 1").fetchone()
        if result:
            print("✅ Database connection successful!")
            return True
        else:
            print("❌ Database connection failed!")
            return False
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False
    finally:
        if 'db' in locals():
            db.close()


def test_table_creation():
    """Test that all tables are created correctly."""
    print("\n📊 Testing table creation...")
    try:
        # Drop and recreate tables
        drop_tables()
        create_tables()
        print("✅ All tables created successfully!")
        return True
    except Exception as e:
        print(f"❌ Table creation error: {e}")
        return False


def test_model_relationships():
    """Test that all model relationships work correctly."""
    print("\n🔗 Testing model relationships...")
    try:
        db = next(get_db())
        
        # Create a test user
        test_user = User(
            email="test@example.com",
            password_hash="test_hash",
            first_name="Test",
            last_name="User",
            accessibility_preferences={"voice_speed": 1.0, "high_contrast": False}
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        # Test creating related records
        # 1. Create a task
        task = Task(
            user_id=test_user.user_id,
            title="Test Task",
            description="This is a test task",
            priority="medium",
            category="test"
        )
        db.add(task)
        db.commit()
        
        # 2. Create a reminder
        reminder = Reminder(
            user_id=test_user.user_id,
            title="Test Reminder",
            description="This is a test reminder",
            reminder_datetime=datetime.utcnow() + timedelta(hours=1),
            frequency="once",
            priority="medium"
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        
        # 3. Create a notification
        notification = Notification(
            reminder_id=reminder.reminder_id,
            user_id=test_user.user_id,
            notification_type="voice",
            message="Test notification message",
            scheduled_time=datetime.utcnow() + timedelta(hours=1),
            status="pending"
        )
        db.add(notification)
        db.commit()
        
        # 4. Create TTS history
        tts_history = TTSHistory(
            user_id=test_user.user_id,
            content="Test TTS content",
            voice_settings={"voice_name": "test", "language": "en-US"},
            speech_rate=1.0,
            volume=1.0,
            context="test"
        )
        db.add(tts_history)
        db.commit()
        
        # 5. Create user settings
        user_setting = UserSettings(
            user_id=test_user.user_id,
            setting_name="test_setting",
            setting_value="test_value"
        )
        db.add(user_setting)
        db.commit()
        
        # 6. Create device sync
        device_sync = DeviceSync(
            user_id=test_user.user_id,
            device_identifier="test_device_001",
            device_name="Test Device",
            device_type="mobile",
            platform="test",
            sync_status="active"
        )
        db.add(device_sync)
        db.commit()
        
        # 7. Create accessibility log
        accessibility_log = AccessibilityLog(
            user_id=test_user.user_id,
            feature_used="test_feature",
            action="test_action",
            session_id="test_session"
        )
        db.add(accessibility_log)
        db.commit()
        
        print("✅ All model relationships work correctly!")
        
        # Test querying relationships
        user_with_relations = db.query(User).filter(User.user_id == test_user.user_id).first()
        assert len(user_with_relations.tasks) == 1
        assert len(user_with_relations.reminders) == 1
        assert len(user_with_relations.notifications) == 1
        assert len(user_with_relations.tts_history) == 1
        assert len(user_with_relations.user_settings) == 1
        assert len(user_with_relations.device_sync) == 1
        assert len(user_with_relations.accessibility_logs) == 1
        
        print("✅ All relationship queries work correctly!")
        
        # Clean up test data
        db.delete(test_user)  # This should cascade delete all related records
        db.commit()
        
        return True
        
    except Exception as e:
        print(f"❌ Model relationship test error: {e}")
        return False
    finally:
        if 'db' in locals():
            db.close()


def test_seed_data():
    """Test that seed data is created correctly."""
    print("\n🌱 Testing seed data creation...")
    try:
        # Reset database and seed
        reset_database()
        seed_database()
        
        db = next(get_db())
        
        # Verify seed data was created
        users = db.query(User).all()
        tasks = db.query(Task).all()
        reminders = db.query(Reminder).all()
        notifications = db.query(Notification).all()
        tts_history = db.query(TTSHistory).all()
        user_settings = db.query(UserSettings).all()
        device_syncs = db.query(DeviceSync).all()
        accessibility_logs = db.query(AccessibilityLog).all()
        
        print(f"✅ Seed data created successfully!")
        print(f"   - {len(users)} users")
        print(f"   - {len(tasks)} tasks")
        print(f"   - {len(reminders)} reminders")
        print(f"   - {len(notifications)} notifications")
        print(f"   - {len(tts_history)} TTS history entries")
        print(f"   - {len(user_settings)} user settings")
        print(f"   - {len(device_syncs)} device sync records")
        print(f"   - {len(accessibility_logs)} accessibility logs")
        
        # Test specific seed data
        john = db.query(User).filter(User.first_name == "John").first()
        if john:
            print(f"✅ Test user 'John' found with {len(john.reminders)} reminders")
        
        return True
        
    except Exception as e:
        print(f"❌ Seed data test error: {e}")
        return False
    finally:
        if 'db' in locals():
            db.close()


def test_queries():
    """Test common database queries."""
    print("\n🔍 Testing common queries...")
    try:
        db = next(get_db())
        
        # Test user queries
        users = db.query(User).filter(User.is_active == True).all()
        print(f"✅ Found {len(users)} active users")
        
        # Test reminder queries
        upcoming_reminders = db.query(Reminder).filter(
            Reminder.reminder_datetime > datetime.utcnow(),
            Reminder.is_active == True
        ).all()
        print(f"✅ Found {len(upcoming_reminders)} upcoming active reminders")
        
        # Test notification queries
        pending_notifications = db.query(Notification).filter(
            Notification.status == "pending"
        ).all()
        print(f"✅ Found {len(pending_notifications)} pending notifications")
        
        # Test TTS history queries
        recent_tts = db.query(TTSHistory).filter(
            TTSHistory.timestamp > datetime.utcnow() - timedelta(days=1)
        ).all()
        print(f"✅ Found {len(recent_tts)} recent TTS history entries")
        
        # Test user settings queries
        voice_settings = db.query(UserSettings).filter(
            UserSettings.setting_name == "voice_name"
        ).all()
        print(f"✅ Found {len(voice_settings)} voice name settings")
        
        # Test device sync queries
        active_devices = db.query(DeviceSync).filter(
            DeviceSync.sync_status == "active"
        ).all()
        print(f"✅ Found {len(active_devices)} active device syncs")
        
        print("✅ All common queries work correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Query test error: {e}")
        return False
    finally:
        if 'db' in locals():
            db.close()


def run_all_tests():
    """Run all database tests."""
    print("🚀 Starting AccessAid Database Tests...\n")
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Table Creation", test_table_creation),
        ("Model Relationships", test_model_relationships),
        ("Seed Data", test_seed_data),
        ("Common Queries", test_queries)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                print(f"❌ {test_name} test failed!")
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your database is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
