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
    # IMPORTANT: Set SECRET_KEY environment variable in production!
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        import warnings
        warnings.warn("SECRET_KEY not set! Using default key. Set SECRET_KEY env var in production!")
        SECRET_KEY = 'dental-calculator-dev-key-change-in-production'
    DEBUG = False
    TESTING = False

    # Get base directory for user data
    USER_DATA_DIR = get_user_data_dir()

    # MySQL Database Configuration
    DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
    DB_PORT = int(os.environ.get('DB_PORT', 3308))
    DB_NAME = os.environ.get('DB_NAME', 'dental_calculator')
    DB_USER = os.environ.get('DB_USER', 'dental_user')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')

    # Session configuration
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'True') == 'True'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 28800  # 8 hours

    # Email configuration (Flask-Mail)
    MAIL_ENABLED = os.environ.get('MAIL_ENABLED', 'True') == 'True'
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False') == 'True'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
    MAIL_DEBUG = os.environ.get('MAIL_DEBUG', 'False') == 'True'

    # Frontend URL for email links
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5002')

    # Token expiration times (in hours, converted to seconds)
    EMAIL_VERIFICATION_EXPIRY_HOURS = int(os.environ.get('EMAIL_VERIFICATION_EXPIRY_HOURS', 24))
    PASSWORD_RESET_EXPIRY_HOURS = int(os.environ.get('PASSWORD_RESET_EXPIRY_HOURS', 1))


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SESSION_COOKIE_SECURE = False
    # In development, emails are logged to console unless MAIL_ENABLED=True
    MAIL_ENABLED = os.environ.get('MAIL_ENABLED', 'False') == 'True'
    MAIL_DEBUG = os.environ.get('MAIL_DEBUG', 'True') == 'True'


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'True') == 'True'  # Enable for HTTPS
    # In production, emails are sent by default
    MAIL_ENABLED = os.environ.get('MAIL_ENABLED', 'True') == 'True'

    def __init__(self):
        # Warn if SECRET_KEY is not properly set in production
        if not os.environ.get('SECRET_KEY'):
            import warnings
            warnings.warn("PRODUCTION WARNING: SECRET_KEY environment variable not set!")


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': ProductionConfig
}
