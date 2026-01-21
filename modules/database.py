"""
Database Module - SQLite database schema and connection management for Dental Pricing Calculator
"""

import sqlite3
import hashlib
import secrets
import os
import sys
from datetime import datetime
from pathlib import Path


def get_data_directory():
    """Get the appropriate data directory for storing user data"""
    if getattr(sys, 'frozen', False):
        if sys.platform == 'darwin':  # macOS
            app_support = Path.home() / 'Library' / 'Application Support' / 'DentalCalculator'
            app_support.mkdir(parents=True, exist_ok=True)
            return str(app_support / 'data')
        elif sys.platform == 'win32':  # Windows
            app_data = Path(os.environ.get('LOCALAPPDATA', Path.home() / 'AppData' / 'Local'))
            app_dir = app_data / 'DentalCalculator'
            app_dir.mkdir(parents=True, exist_ok=True)
            return str(app_dir / 'data')

    return os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')


# Get database path from environment or use platform-appropriate default
DB_PATH = os.environ.get('DATABASE_PATH') or os.path.join(get_data_directory(), 'dental_calculator.db')


def get_connection():
    """Get database connection with row factory"""
    db_dir = os.path.dirname(DB_PATH)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    conn = sqlite3.connect(DB_PATH, timeout=60.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 60000")
    return conn


def dict_from_row(row):
    """Convert sqlite3.Row to dictionary"""
    return dict(row) if row else None


def hash_password(password, salt=None):
    """Hash password with PBKDF2-SHA256"""
    if salt is None:
        salt = secrets.token_hex(32)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${pwd_hash.hex()}"


def verify_password(password, stored_hash):
    """Verify password against stored hash"""
    try:
        salt, _ = stored_hash.split('$')
        return hash_password(password, salt) == stored_hash
    except:
        return False


def init_database():
    """Initialize database with all tables"""
    conn = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Global Settings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS global_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            currency TEXT DEFAULT 'EGP',
            vat_percent REAL DEFAULT 0,
            default_profit_percent REAL DEFAULT 40,
            rounding_nearest INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Fixed Costs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fixed_costs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            monthly_amount REAL NOT NULL,
            included INTEGER DEFAULT 1,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Salaries table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS salaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_name TEXT NOT NULL,
            monthly_salary REAL NOT NULL,
            included INTEGER DEFAULT 1,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Equipment table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS equipment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_name TEXT NOT NULL,
            purchase_cost REAL NOT NULL,
            life_years INTEGER NOT NULL,
            allocation_type TEXT CHECK(allocation_type IN ('fixed', 'per-hour')) NOT NULL,
            monthly_usage_hours REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Clinic Capacity Settings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clinic_capacity (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            chairs INTEGER DEFAULT 1,
            days_per_month INTEGER DEFAULT 24,
            hours_per_day INTEGER DEFAULT 8,
            utilization_percent REAL DEFAULT 80,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Consumables Library table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consumables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT NOT NULL,
            pack_cost REAL NOT NULL,
            cases_per_pack INTEGER NOT NULL,
            units_per_case INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Services table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            chair_time_hours REAL NOT NULL,
            doctor_hourly_fee REAL NOT NULL,
            use_default_profit INTEGER DEFAULT 1,
            custom_profit_percent REAL,
            equipment_id INTEGER,
            equipment_hours_used REAL,
            current_price REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (equipment_id) REFERENCES equipment(id)
        )
    ''')

    # Add current_price column if it doesn't exist (migration)
    cursor.execute("PRAGMA table_info(services)")
    columns = [column[1] for column in cursor.fetchall()]
    if 'current_price' not in columns:
        cursor.execute('ALTER TABLE services ADD COLUMN current_price REAL')

    # Service Consumables (junction table)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS service_consumables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER NOT NULL,
            consumable_id INTEGER NOT NULL,
            quantity REAL NOT NULL,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
            FOREIGN KEY (consumable_id) REFERENCES consumables(id)
        )
    ''')

    conn.commit()
    conn.close()


def create_initial_admin():
    """Create initial admin user if no users exist"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    print("\n" + "="*60)
    print("  DENTAL CALCULATOR - Initial Setup")
    print("="*60)
    print("\n⚠️  Creating admin account...")
    print("\n📝 Login Credentials:")
    print("   Username: admin")
    print("   Password: 12345")
    print("\n🔐 Please change this password after first login!")
    print("="*60 + "\n")

    admin_hash = hash_password('12345')
    cursor.execute('''
        INSERT INTO users (username, password_hash, first_name, last_name, email)
        VALUES (?, ?, 'Admin', 'User', 'admin@dentalcalc.local')
    ''', ('admin', admin_hash))

    conn.commit()
    conn.close()


def create_sample_data():
    """Create sample data for demonstration"""
    conn = get_connection()
    cursor = conn.cursor()

    # Check if data exists
    cursor.execute("SELECT COUNT(*) FROM fixed_costs")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    print("🔧 Creating sample data...")

    # Global Settings
    cursor.execute('''
        INSERT OR REPLACE INTO global_settings (id, currency, vat_percent, default_profit_percent, rounding_nearest)
        VALUES (1, 'EGP', 0, 40, 5)
    ''')

    # Fixed Costs
    fixed_costs = [
        ('Rent', 20000, 1, 'Monthly clinic rent'),
        ('Utilities (electricity/water/internet)', 2500, 1, 'Base costs'),
        ('Admin/Marketing', 3000, 1, 'Administrative expenses'),
        ('Insurance', 0, 0, 'Optional'),
        ('Software/Subscriptions', 800, 1, 'Management software'),
        ('Cleaning/Laundry', 600, 1, 'Maintenance'),
        ('Miscellaneous Buffer', 500, 1, 'Unexpected costs'),
    ]
    cursor.executemany('''
        INSERT INTO fixed_costs (category, monthly_amount, included, notes)
        VALUES (?, ?, ?, ?)
    ''', fixed_costs)

    # Salaries
    salaries = [
        ('Receptionist', 8000, 1, 'Front desk'),
        ('Assistant 1', 12000, 1, 'Clinical assistant'),
        ('Assistant 2', 12000, 1, 'Clinical assistant'),
        ('Cleaner', 4000, 1, 'Facility maintenance'),
    ]
    cursor.executemany('''
        INSERT INTO salaries (role_name, monthly_salary, included, notes)
        VALUES (?, ?, ?, ?)
    ''', salaries)

    # Equipment
    equipment = [
        ('Dental Chair', 100000, 10, 'fixed', None),
        ('CBCT Machine', 800000, 8, 'fixed', None),
        ('Intraoral Scanner', 250000, 7, 'per-hour', 30),
        ('Laser Unit', 120000, 5, 'per-hour', 20),
    ]
    cursor.executemany('''
        INSERT INTO equipment (asset_name, purchase_cost, life_years, allocation_type, monthly_usage_hours)
        VALUES (?, ?, ?, ?, ?)
    ''', equipment)

    # Clinic Capacity
    cursor.execute('''
        INSERT OR REPLACE INTO clinic_capacity (id, chairs, days_per_month, hours_per_day, utilization_percent)
        VALUES (1, 1, 24, 8, 80)
    ''')

    # Consumables (item_name, pack_cost, cases_per_pack, units_per_case)
    # Example: A pack costs 250, contains 10 boxes, each box has 50 units
    consumables = [
        ('Latex Gloves (Box)', 300, 10, 100),  # Pack of 10 boxes, 100 gloves per box
        ('Anesthetic Cartridge (Lidocaine)', 400, 1, 50),  # 1 pack = 50 cartridges
        ('Dental Composite Material', 500, 1, 20),  # 1 pack = 20 syringes
        ('Bonding Agent Bottle', 250, 1, 50),  # 1 pack = 50 applications
        ('Etching Gel Syringe', 150, 1, 30),  # 1 pack = 30 syringes
        ('Cotton Rolls (Pack)', 80, 1, 200),  # 1 pack = 200 rolls
        ('Gauze Sponges (Pack)', 120, 1, 100),  # 1 pack = 100 sponges
        ('Suture Kit', 600, 1, 12),  # 1 pack = 12 kits
        ('Dental Bur (Diamond)', 200, 1, 10),  # 1 pack = 10 burs
        ('Temporary Filling Material', 180, 1, 30),  # 1 pack = 30 applications
        ('Dental Floss (Spools)', 90, 1, 50),  # 1 pack = 50 spools
        ('Disposable Bibs', 150, 1, 500),  # 1 pack = 500 bibs
    ]
    cursor.executemany('''
        INSERT INTO consumables (item_name, pack_cost, cases_per_pack, units_per_case)
        VALUES (?, ?, ?, ?)
    ''', consumables)

    # Services (name, chair_time_hours, doctor_hourly_fee, use_default_profit, custom_profit_percent, current_price)
    services = [
        ('Dental Checkup & Cleaning', 0.75, 400, 1, None, 450),
        ('Composite Filling - Small Cavity', 0.5, 600, 1, None, 650),
        ('Composite Filling - Large Cavity', 1.0, 600, 1, None, 850),
        ('Root Canal Treatment - Single Root', 1.5, 800, 1, None, 1800),
        ('Root Canal Treatment - Multi Root', 2.5, 800, 1, None, 2800),
        ('Tooth Extraction - Simple', 0.5, 500, 1, None, 500),
        ('Tooth Extraction - Surgical', 1.0, 700, 1, None, 900),
        ('Dental Crown Preparation', 1.5, 700, 1, None, 1200),
        ('Teeth Whitening', 1.0, 500, 1, None, 800),
        ('Deep Cleaning (Scaling & Root Planing)', 1.5, 500, 1, None, 950),
    ]
    cursor.executemany('''
        INSERT INTO services (name, chair_time_hours, doctor_hourly_fee, use_default_profit, custom_profit_percent, current_price)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', services)

    # Service Consumables Examples (service_id, consumable_id, quantity)
    # Service 1: Dental Checkup & Cleaning
    # Service 2: Composite Filling - Small
    # Service 3: Composite Filling - Large
    service_consumables = [
        # Dental Checkup & Cleaning (Service 1)
        (1, 1, 2),   # 2 pairs of Latex Gloves
        (1, 6, 10),  # 10 Cotton Rolls
        (1, 7, 5),   # 5 Gauze Sponges
        (1, 11, 1),  # 1 Dental Floss
        (1, 12, 1),  # 1 Disposable Bib

        # Composite Filling - Small (Service 2)
        (2, 1, 2),   # 2 pairs of Latex Gloves
        (2, 2, 0.5), # 0.5 Anesthetic Cartridge
        (2, 3, 1),   # 1 Composite Material syringe
        (2, 4, 1),   # 1 Bonding Agent application
        (2, 5, 1),   # 1 Etching Gel syringe
        (2, 6, 8),   # 8 Cotton Rolls
        (2, 7, 4),   # 4 Gauze Sponges
        (2, 9, 2),   # 2 Dental Burs
        (2, 12, 1),  # 1 Disposable Bib

        # Composite Filling - Large (Service 3)
        (3, 1, 2),   # 2 pairs of Latex Gloves
        (3, 2, 1),   # 1 Anesthetic Cartridge
        (3, 3, 2),   # 2 Composite Material syringes
        (3, 4, 1.5), # 1.5 Bonding Agent applications
        (3, 5, 1),   # 1 Etching Gel syringe
        (3, 6, 12),  # 12 Cotton Rolls
        (3, 7, 6),   # 6 Gauze Sponges
        (3, 9, 3),   # 3 Dental Burs
        (3, 12, 1),  # 1 Disposable Bib
    ]
    cursor.executemany('''
        INSERT INTO service_consumables (service_id, consumable_id, quantity)
        VALUES (?, ?, ?)
    ''', service_consumables)

    conn.commit()
    conn.close()
    print("Sample data created successfully!")
