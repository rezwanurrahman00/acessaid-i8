#!/usr/bin/env python3
"""
Database setup script for AccessAid.
Run this script to initialize the database with tables and sample data.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import create_tables, reset_database
from seed_data import seed_database


def main():
    """Main function to set up the database."""
    print("🚀 Setting up AccessAid database...")
    
    try:
        # Create all tables
        print("📊 Creating database tables...")
        create_tables()
        print("✅ Database tables created successfully!")
        
        # Seed with sample data
        print("🌱 Seeding database with sample data...")
        seed_database()
        print("✅ Database seeded successfully!")
        
        print("\n🎉 Database setup completed!")
        print("You can now start the FastAPI server and begin development.")
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
