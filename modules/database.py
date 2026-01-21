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

    # Clinics table (multi-tenant support)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clinics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            city TEXT,
            country TEXT DEFAULT 'Egypt',
            logo_url TEXT,
            subscription_plan TEXT DEFAULT 'free',
            subscription_status TEXT DEFAULT 'active',
            subscription_expires_at TIMESTAMP,
            max_users INTEGER DEFAULT 3,
            max_services INTEGER DEFAULT 50,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Users table (updated with clinic_id and role)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER,
            username TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'staff',
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clinic_id) REFERENCES clinics(id),
            UNIQUE(clinic_id, username)
        )
    ''')

    # Global Settings table (per clinic)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS global_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER NOT NULL,
            currency TEXT DEFAULT 'EGP',
            vat_percent REAL DEFAULT 0,
            default_profit_percent REAL DEFAULT 40,
            rounding_nearest INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clinic_id) REFERENCES clinics(id),
            UNIQUE(clinic_id)
        )
    ''')

    # Fixed Costs table (per clinic)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fixed_costs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            monthly_amount REAL NOT NULL,
            included INTEGER DEFAULT 1,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        )
    ''')

    # Salaries table (per clinic)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS salaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER NOT NULL,
            role_name TEXT NOT NULL,
            monthly_salary REAL NOT NULL,
            included INTEGER DEFAULT 1,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        )
    ''')

    # Equipment table (per clinic)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS equipment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER NOT NULL,
            asset_name TEXT NOT NULL,
            purchase_cost REAL NOT NULL,
            life_years INTEGER NOT NULL,
            allocation_type TEXT CHECK(allocation_type IN ('fixed', 'per-hour')) NOT NULL,
            monthly_usage_hours REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        )
    ''')

    # Clinic Capacity Settings table (per clinic)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clinic_capacity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER NOT NULL,
            chairs INTEGER DEFAULT 1,
            days_per_month INTEGER DEFAULT 24,
            hours_per_day INTEGER DEFAULT 8,
            utilization_percent REAL DEFAULT 80,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clinic_id) REFERENCES clinics(id),
            UNIQUE(clinic_id)
        )
    ''')

    # Consumables Library table (per clinic)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consumables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            pack_cost REAL NOT NULL,
            cases_per_pack INTEGER NOT NULL,
            units_per_case INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        )
    ''')

    # Services table (per clinic)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER NOT NULL,
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
            FOREIGN KEY (clinic_id) REFERENCES clinics(id),
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

    # Password reset tokens table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Invitation tokens table (for inviting users to clinics)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS invitation_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clinic_id INTEGER NOT NULL,
            email TEXT NOT NULL,
            role TEXT DEFAULT 'staff',
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        )
    ''')

    conn.commit()
    conn.close()


def create_initial_admin():
    """Create initial demo clinic and admin user if no clinics exist"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM clinics")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    print("\n" + "="*60)
    print("  DENTAL CALCULATOR - Initial Setup")
    print("="*60)
    print("\n⚠️  Creating demo clinic and admin account...")
    print("\n📝 Login Credentials:")
    print("   Username: admin")
    print("   Password: 12345")
    print("\n🔐 Please change this password after first login!")
    print("="*60 + "\n")

    # Create demo clinic
    cursor.execute('''
        INSERT INTO clinics (name, slug, email, phone, address, city, country, subscription_plan, max_users, max_services)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', ('Demo Dental Clinic', 'demo-clinic', 'demo@dentalcalc.local', '+20 100 000 0000',
          '123 Demo Street', 'Cairo', 'Egypt', 'professional', 10, 100))
    clinic_id = cursor.lastrowid

    # Create admin user for demo clinic
    admin_hash = hash_password('12345')
    cursor.execute('''
        INSERT INTO users (clinic_id, username, password_hash, first_name, last_name, email, role)
        VALUES (?, ?, ?, 'Admin', 'User', 'admin@dentalcalc.local', 'owner')
    ''', (clinic_id, 'admin', admin_hash))

    # Create default settings for demo clinic
    cursor.execute('''
        INSERT INTO global_settings (clinic_id, currency, vat_percent, default_profit_percent, rounding_nearest)
        VALUES (?, 'EGP', 0, 40, 5)
    ''', (clinic_id,))

    # Create default clinic capacity
    cursor.execute('''
        INSERT INTO clinic_capacity (clinic_id, chairs, days_per_month, hours_per_day, utilization_percent)
        VALUES (?, 1, 24, 8, 80)
    ''', (clinic_id,))

    conn.commit()
    conn.close()


def create_sample_data():
    """Create sample data for demonstration"""
    conn = get_connection()
    cursor = conn.cursor()

    # Get demo clinic ID
    cursor.execute("SELECT id FROM clinics WHERE slug = 'demo-clinic'")
    row = cursor.fetchone()
    if not row:
        conn.close()
        return
    clinic_id = row[0]

    # Check if data exists for this clinic
    cursor.execute("SELECT COUNT(*) FROM fixed_costs WHERE clinic_id = ?", (clinic_id,))
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    print("🔧 Creating sample data...")

    # Fixed Costs
    fixed_costs = [
        (clinic_id, 'Rent', 20000, 1, 'Monthly clinic rent'),
        (clinic_id, 'Utilities (electricity/water/internet)', 2500, 1, 'Base costs'),
        (clinic_id, 'Admin/Marketing', 3000, 1, 'Administrative expenses'),
        (clinic_id, 'Insurance', 0, 0, 'Optional'),
        (clinic_id, 'Software/Subscriptions', 800, 1, 'Management software'),
        (clinic_id, 'Cleaning/Laundry', 600, 1, 'Maintenance'),
        (clinic_id, 'Miscellaneous Buffer', 500, 1, 'Unexpected costs'),
    ]
    cursor.executemany('''
        INSERT INTO fixed_costs (clinic_id, category, monthly_amount, included, notes)
        VALUES (?, ?, ?, ?, ?)
    ''', fixed_costs)

    # Salaries
    salaries = [
        (clinic_id, 'Receptionist', 8000, 1, 'Front desk'),
        (clinic_id, 'Assistant 1', 12000, 1, 'Clinical assistant'),
        (clinic_id, 'Assistant 2', 12000, 1, 'Clinical assistant'),
        (clinic_id, 'Cleaner', 4000, 1, 'Facility maintenance'),
    ]
    cursor.executemany('''
        INSERT INTO salaries (clinic_id, role_name, monthly_salary, included, notes)
        VALUES (?, ?, ?, ?, ?)
    ''', salaries)

    # Equipment
    equipment = [
        (clinic_id, 'Dental Chair', 100000, 10, 'fixed', None),
        (clinic_id, 'CBCT Machine', 800000, 8, 'fixed', None),
        (clinic_id, 'Intraoral Scanner', 250000, 7, 'per-hour', 30),
        (clinic_id, 'Laser Unit', 120000, 5, 'per-hour', 20),
    ]
    cursor.executemany('''
        INSERT INTO equipment (clinic_id, asset_name, purchase_cost, life_years, allocation_type, monthly_usage_hours)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', equipment)

    # Consumables (clinic_id, item_name, pack_cost, cases_per_pack, units_per_case)
    # Example: A pack costs 250, contains 10 boxes, each box has 50 units
    consumables = [
        (clinic_id, 'Latex Gloves (Box)', 300, 10, 100),  # Pack of 10 boxes, 100 gloves per box
        (clinic_id, 'Anesthetic Cartridge (Lidocaine)', 400, 1, 50),  # 1 pack = 50 cartridges
        (clinic_id, 'Dental Composite Material', 500, 1, 20),  # 1 pack = 20 syringes
        (clinic_id, 'Bonding Agent Bottle', 250, 1, 50),  # 1 pack = 50 applications
        (clinic_id, 'Etching Gel Syringe', 150, 1, 30),  # 1 pack = 30 syringes
        (clinic_id, 'Cotton Rolls (Pack)', 80, 1, 200),  # 1 pack = 200 rolls
        (clinic_id, 'Gauze Sponges (Pack)', 120, 1, 100),  # 1 pack = 100 sponges
        (clinic_id, 'Suture Kit', 600, 1, 12),  # 1 pack = 12 kits
        (clinic_id, 'Dental Bur (Diamond)', 200, 1, 10),  # 1 pack = 10 burs
        (clinic_id, 'Temporary Filling Material', 180, 1, 30),  # 1 pack = 30 applications
        (clinic_id, 'Dental Floss (Spools)', 90, 1, 50),  # 1 pack = 50 spools
        (clinic_id, 'Disposable Bibs', 150, 1, 500),  # 1 pack = 500 bibs
    ]
    cursor.executemany('''
        INSERT INTO consumables (clinic_id, item_name, pack_cost, cases_per_pack, units_per_case)
        VALUES (?, ?, ?, ?, ?)
    ''', consumables)

    # Services (clinic_id, name, chair_time_hours, doctor_hourly_fee, use_default_profit, custom_profit_percent, current_price)
    services = [
        (clinic_id, 'Dental Checkup & Cleaning', 0.75, 400, 1, None, 450),
        (clinic_id, 'Composite Filling - Small Cavity', 0.5, 600, 1, None, 650),
        (clinic_id, 'Composite Filling - Large Cavity', 1.0, 600, 1, None, 850),
        (clinic_id, 'Root Canal Treatment - Single Root', 1.5, 800, 1, None, 1800),
        (clinic_id, 'Root Canal Treatment - Multi Root', 2.5, 800, 1, None, 2800),
        (clinic_id, 'Tooth Extraction - Simple', 0.5, 500, 1, None, 500),
        (clinic_id, 'Tooth Extraction - Surgical', 1.0, 700, 1, None, 900),
        (clinic_id, 'Dental Crown Preparation', 1.5, 700, 1, None, 1200),
        (clinic_id, 'Teeth Whitening', 1.0, 500, 1, None, 800),
        (clinic_id, 'Deep Cleaning (Scaling & Root Planing)', 1.5, 500, 1, None, 950),
    ]
    cursor.executemany('''
        INSERT INTO services (clinic_id, name, chair_time_hours, doctor_hourly_fee, use_default_profit, custom_profit_percent, current_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
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
