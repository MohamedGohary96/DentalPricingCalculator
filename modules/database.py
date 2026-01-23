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

    # Add doctor fee type columns if they don't exist (migration)
    if 'doctor_fee_type' not in columns:
        cursor.execute("ALTER TABLE services ADD COLUMN doctor_fee_type TEXT DEFAULT 'hourly'")
    if 'doctor_fixed_fee' not in columns:
        cursor.execute('ALTER TABLE services ADD COLUMN doctor_fixed_fee REAL DEFAULT 0')
    if 'doctor_percentage' not in columns:
        cursor.execute('ALTER TABLE services ADD COLUMN doctor_percentage REAL DEFAULT 0')

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
    # Realistic dental consumable pricing
    consumables = [
        (clinic_id, 'Nitrile Gloves (Box of 100)', 180, 1, 100),  # EGP 1.80 per pair
        (clinic_id, 'Anesthetic Cartridge (Lidocaine 2%)', 850, 1, 50),  # EGP 17 per cartridge
        (clinic_id, 'Composite Resin A2 (4g syringe)', 1200, 1, 1),  # EGP 1200 per syringe
        (clinic_id, 'Bonding Agent (5ml bottle)', 900, 1, 40),  # ~EGP 22.50 per application
        (clinic_id, 'Etch Gel 37% (3ml syringe)', 120, 1, 15),  # EGP 8 per application
        (clinic_id, 'Cotton Rolls (Pack of 1000)', 250, 1, 1000),  # EGP 0.25 each
        (clinic_id, 'Gauze 2x2 (Pack of 200)', 180, 1, 200),  # EGP 0.90 each
        (clinic_id, 'Suture 3-0 Silk', 75, 1, 1),  # EGP 75 per suture
        (clinic_id, 'Diamond Bur (Pack of 5)', 350, 1, 5),  # EGP 70 per bur
        (clinic_id, 'Temporary Filling (Cavit)', 280, 1, 25),  # EGP 11.20 per application
        (clinic_id, 'Disposable Bib', 200, 1, 100),  # EGP 2 each
        (clinic_id, 'Zirconia Crown (Lab)', 3500, 1, 1),  # EGP 3500 per crown
        (clinic_id, 'PFM Crown (Lab)', 2200, 1, 1),  # EGP 2200 per crown
        (clinic_id, 'Implant Fixture (Korean)', 8500, 1, 1),  # EGP 8500 per implant
        (clinic_id, 'Implant Abutment', 2500, 1, 1),  # EGP 2500 per abutment
        (clinic_id, 'Gutta Percha Points (Pack)', 450, 1, 120),  # EGP 3.75 each
        (clinic_id, 'Endodontic File (Pack of 6)', 280, 1, 6),  # EGP 46.67 each
        (clinic_id, 'Impression Material (Heavy Body)', 650, 1, 10),  # EGP 65 per impression
        (clinic_id, 'Alginate (450g bag)', 180, 1, 15),  # EGP 12 per impression
        (clinic_id, 'Whitening Gel (Syringe)', 450, 1, 3),  # EGP 150 per session
    ]
    cursor.executemany('''
        INSERT INTO consumables (clinic_id, item_name, pack_cost, cases_per_pack, units_per_case)
        VALUES (?, ?, ?, ?, ?)
    ''', consumables)

    # Services (clinic_id, name, chair_time_hours, doctor_hourly_fee, use_default_profit, custom_profit_percent, current_price)
    # Realistic dental service pricing (EGP 250 - 30,000 range)
    services = [
        (clinic_id, 'Consultation', 0.25, 300, 1, None, 250),  # Quick consultation
        (clinic_id, 'Dental Checkup & Cleaning', 0.75, 400, 1, None, 400),  # Basic cleaning
        (clinic_id, 'Composite Filling - Small', 0.5, 500, 1, None, 600),  # 1 surface
        (clinic_id, 'Composite Filling - Large', 1.0, 500, 1, None, 900),  # 3+ surfaces
        (clinic_id, 'Root Canal - Anterior', 1.5, 800, 1, None, 1800),  # Front tooth
        (clinic_id, 'Root Canal - Molar', 2.5, 1000, 1, None, 3500),  # Back tooth
        (clinic_id, 'Extraction - Simple', 0.5, 400, 1, None, 400),  # Mobile tooth
        (clinic_id, 'Extraction - Surgical', 1.0, 600, 1, None, 1200),  # Impacted
        (clinic_id, 'Wisdom Tooth Extraction', 1.5, 800, 1, None, 2500),  # Surgical wisdom
        (clinic_id, 'Zirconia Crown', 2.0, 800, 1, None, 6000),  # Premium crown
        (clinic_id, 'PFM Crown', 2.0, 700, 1, None, 4500),  # Porcelain fused metal
        (clinic_id, 'Veneer - Porcelain', 1.5, 800, 1, None, 5500),  # Per tooth
        (clinic_id, 'Teeth Whitening - In Office', 1.5, 500, 1, None, 3000),  # Full session
        (clinic_id, 'Deep Scaling & Root Planing', 1.5, 500, 1, None, 800),  # Per quadrant
        (clinic_id, 'Dental Implant - Single', 2.0, 1500, 1, None, 18000),  # Implant only
        (clinic_id, 'Implant with Crown', 3.0, 1500, 1, None, 25000),  # Complete
        (clinic_id, 'Full Denture - Upper or Lower', 3.0, 800, 1, None, 8000),  # Per arch
        (clinic_id, 'Partial Denture - Acrylic', 2.0, 600, 1, None, 4000),  # Basic
        (clinic_id, 'Night Guard', 1.0, 400, 1, None, 1500),  # Bruxism guard
        (clinic_id, 'Full Mouth Rehabilitation', 8.0, 2000, 1, None, 30000),  # Complex case
    ]
    cursor.executemany('''
        INSERT INTO services (clinic_id, name, chair_time_hours, doctor_hourly_fee, use_default_profit, custom_profit_percent, current_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', services)

    # Service Consumables Examples (service_id, consumable_id, quantity)
    # Consumable IDs: 1=Gloves, 2=Anesthetic, 3=Composite, 4=Bonding, 5=Etch, 6=Cotton, 7=Gauze,
    # 8=Suture, 9=Bur, 10=TempFill, 11=Bib, 12=ZircCrown, 13=PFMCrown, 14=Implant, 15=Abutment,
    # 16=GuttaPercha, 17=EndoFile, 18=ImpMaterial, 19=Alginate, 20=WhiteningGel
    service_consumables = [
        # Service 1: Consultation (minimal)
        (1, 1, 2),   # 2 gloves
        (1, 11, 1),  # 1 bib

        # Service 2: Checkup & Cleaning
        (2, 1, 4),   # 4 gloves
        (2, 6, 10),  # 10 cotton rolls
        (2, 7, 5),   # 5 gauze
        (2, 11, 1),  # 1 bib

        # Service 3: Composite Filling - Small
        (3, 1, 4),   # 4 gloves
        (3, 2, 1),   # 1 anesthetic cartridge
        (3, 3, 0.3), # 0.3 composite syringe
        (3, 4, 1),   # 1 bonding application
        (3, 5, 1),   # 1 etch application
        (3, 6, 8),   # 8 cotton rolls
        (3, 9, 1),   # 1 bur
        (3, 11, 1),  # 1 bib

        # Service 4: Composite Filling - Large
        (4, 1, 4),   # 4 gloves
        (4, 2, 1),   # 1 anesthetic
        (4, 3, 0.6), # 0.6 composite syringe
        (4, 4, 2),   # 2 bonding applications
        (4, 5, 1),   # 1 etch
        (4, 6, 12),  # 12 cotton rolls
        (4, 9, 2),   # 2 burs
        (4, 11, 1),  # 1 bib

        # Service 5: Root Canal - Anterior
        (5, 1, 6),   # 6 gloves
        (5, 2, 2),   # 2 anesthetic
        (5, 6, 20),  # 20 cotton rolls
        (5, 7, 10),  # 10 gauze
        (5, 16, 5),  # 5 gutta percha points
        (5, 17, 3),  # 3 endo files
        (5, 10, 1),  # 1 temp fill
        (5, 11, 1),  # 1 bib

        # Service 6: Root Canal - Molar
        (6, 1, 8),   # 8 gloves
        (6, 2, 3),   # 3 anesthetic
        (6, 6, 30),  # 30 cotton rolls
        (6, 7, 15),  # 15 gauze
        (6, 16, 12), # 12 gutta percha points
        (6, 17, 6),  # 6 endo files
        (6, 10, 1),  # 1 temp fill
        (6, 11, 1),  # 1 bib

        # Service 10: Zirconia Crown
        (10, 1, 6),  # 6 gloves
        (10, 2, 2),  # 2 anesthetic
        (10, 9, 3),  # 3 burs
        (10, 18, 1), # 1 impression
        (10, 12, 1), # 1 zirconia crown (lab)
        (10, 10, 1), # 1 temp fill
        (10, 11, 1), # 1 bib

        # Service 11: PFM Crown
        (11, 1, 6),  # 6 gloves
        (11, 2, 2),  # 2 anesthetic
        (11, 9, 3),  # 3 burs
        (11, 18, 1), # 1 impression
        (11, 13, 1), # 1 PFM crown (lab)
        (11, 10, 1), # 1 temp fill
        (11, 11, 1), # 1 bib

        # Service 13: Teeth Whitening
        (13, 1, 4),  # 4 gloves
        (13, 20, 1), # 1 whitening gel session
        (13, 11, 1), # 1 bib

        # Service 15: Dental Implant
        (15, 1, 8),  # 8 gloves
        (15, 2, 3),  # 3 anesthetic
        (15, 7, 20), # 20 gauze
        (15, 8, 2),  # 2 sutures
        (15, 14, 1), # 1 implant fixture
        (15, 11, 1), # 1 bib

        # Service 16: Implant with Crown
        (16, 1, 12), # 12 gloves (multiple visits)
        (16, 2, 4),  # 4 anesthetic
        (16, 7, 25), # 25 gauze
        (16, 8, 2),  # 2 sutures
        (16, 14, 1), # 1 implant fixture
        (16, 15, 1), # 1 abutment
        (16, 12, 1), # 1 zirconia crown
        (16, 18, 1), # 1 impression
        (16, 11, 2), # 2 bibs
    ]
    cursor.executemany('''
        INSERT INTO service_consumables (service_id, consumable_id, quantity)
        VALUES (?, ?, ?)
    ''', service_consumables)

    conn.commit()
    conn.close()
    print("Sample data created successfully!")
