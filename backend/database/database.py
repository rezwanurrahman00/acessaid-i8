"""
Database configuration and session management for AccessAid.
This module handles MySQL database setup and session management.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
# MySQL connection string format: mysql+pymysql://user:password@host:port/database
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "accessaid")

DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"

# Create engine with MySQL-specific configurations
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600,   # Recycle connections after 1 hour
    pool_size=10,        # Connection pool size
    max_overflow=20,     # Max connections beyond pool_size
    echo=True            # Set to False in production
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Dependency to get database session.
    Use this in FastAPI endpoints to get a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all database tables."""
    from .models import Base
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all database tables."""
    from .models import Base
    Base.metadata.drop_all(bind=engine)


def reset_database():
    """Reset the database by dropping and recreating all tables."""
    drop_tables()
    create_tables()
    print("Database reset completed.")


# Initialize database on import
if __name__ == "__main__":
    create_tables()
    print("Database tables created successfully.")
