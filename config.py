"""
Configuration Module for Dental Pricing Calculator
"""
import os
import sys
from pathlib import Path


def get_user_data_dir():
    """Get platform-appropriate user data directory for standalone builds"""
    if getattr(sys, 'frozen', False):
        if sys.platform == 'darwin':  # macOS
            base_dir = Path.home() / 'Library' / 'Application Support' / 'DentalCalculator'
        elif sys.platform == 'win32':  # Windows
            base_dir = Path(os.environ.get('LOCALAPPDATA', Path.home() / 'AppData' / 'Local')) / 'DentalCalculator'
        else:  # Linux/other
            base_dir = Path.home() / '.dentalcalculator'

        base_dir.mkdir(parents=True, exist_ok=True)
        return str(base_dir)

    # Development mode - use current directory
    return '.'


class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dental-calculator-secret-key-2026'
    DEBUG = False
    TESTING = False

    # Get base directory for user data
    USER_DATA_DIR = get_user_data_dir()

    # Database - only use env var if it's set and not empty
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or os.path.join(USER_DATA_DIR, 'data', 'dental_calculator.db')

    # Session configuration
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'True') == 'True'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 28800  # 8 hours

    # Email configuration (Flask-Mail)
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False') == 'True'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')

    # Frontend URL for email links
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5002')

    # Token expiration times (in seconds)
    EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60  # 24 hours
    PASSWORD_RESET_EXPIRY = 60 * 60  # 1 hour


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SESSION_COOKIE_SECURE = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SESSION_COOKIE_SECURE = False  # Set to True if using HTTPS


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': ProductionConfig
}
