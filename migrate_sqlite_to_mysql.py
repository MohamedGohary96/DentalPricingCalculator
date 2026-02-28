"""
SQLite to MySQL Data Migration Script
Migrates all data from the existing SQLite database to the new MySQL database.

Usage:
    python migrate_sqlite_to_mysql.py

Prerequisites:
    1. MySQL server running on port 3308
    2. Database 'dental_calculator' created with proper charset
    3. User 'dental_user' with full privileges on dental_calculator
    4. Tables already created by running the app once against MySQL (python app.py)
    5. PyMySQL installed (pip install PyMySQL)
"""

import sqlite3
import pymysql
import pymysql.cursors
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# SQLite source database
SQLITE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'dental_calculator.db')

# MySQL target configuration
MYSQL_CONFIG = {
    'host': os.environ.get('DB_HOST', '127.0.0.1'),
    'port': int(os.environ.get('DB_PORT', 3308)),
    'user': os.environ.get('DB_USER', 'dental_user'),
    'password': os.environ.get('DB_PASSWORD', ''),
    'database': os.environ.get('DB_NAME', 'dental_calculator'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
}

# Enable SSL for cloud databases
if os.environ.get('DB_SSL', '').lower() in ('true', '1', 'required'):
    ssl_config = {'ssl': True}
    ca_path = os.environ.get('DB_SSL_CA', '')
    if ca_path and os.path.exists(ca_path):
        ssl_config['ca'] = ca_path
    MYSQL_CONFIG['ssl'] = ssl_config

# Tables in foreign-key-safe insertion order
TABLES_IN_ORDER = [
    'clinics',
    'users',
    'global_settings',
    'fixed_costs',
    'salaries',
    'equipment',
    'clinic_capacity',
    'consumables',
    'service_categories',
    'lab_materials',
    'services',
    'service_consumables',
    'service_materials',
    'service_equipment',
    'email_verification_tokens',
    'password_reset_tokens',
    'invitation_tokens',
    'subscription_payments',
]


def migrate():
    """Migrate all data from SQLite to MySQL"""
    # Check SQLite file exists
    if not os.path.exists(SQLITE_PATH):
        print(f"Error: SQLite database not found at {SQLITE_PATH}")
        sys.exit(1)

    print("=" * 60)
    print("  SQLite to MySQL Migration")
    print("=" * 60)
    print(f"\nSource: {SQLITE_PATH}")
    print(f"Target: {MYSQL_CONFIG['host']}:{MYSQL_CONFIG['port']}/{MYSQL_CONFIG['database']}")
    print()

    # Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row

    # Connect to MySQL
    try:
        mysql_conn = pymysql.connect(**MYSQL_CONFIG)
    except pymysql.Error as e:
        print(f"Error connecting to MySQL: {e}")
        print("\nMake sure:")
        print("  1. MySQL is running on port 3308")
        print("  2. Database 'dental_calculator' exists")
        print("  3. User credentials in .env are correct")
        sys.exit(1)

    mysql_cursor = mysql_conn.cursor()

    # Disable foreign key checks for bulk insert
    mysql_cursor.execute('SET FOREIGN_KEY_CHECKS = 0')

    total_rows = 0
    errors = []

    for table in TABLES_IN_ORDER:
        try:
            # Read from SQLite
            sqlite_cursor = sqlite_conn.cursor()
            sqlite_cursor.execute(f'SELECT * FROM {table}')
            rows = sqlite_cursor.fetchall()

            if not rows:
                print(f"  {table}: 0 rows (skipped)")
                continue

            # Get column names from the first row
            columns = rows[0].keys()
            col_names = ', '.join(columns)
            placeholders = ', '.join(['%s'] * len(columns))

            # Clear existing data in MySQL table
            mysql_cursor.execute(f'DELETE FROM {table}')

            # Insert data - convert empty strings to None for numeric columns
            insert_sql = f'INSERT INTO {table} ({col_names}) VALUES ({placeholders})'
            data = [tuple(None if v == '' else v for v in dict(row).values()) for row in rows]

            # Use executemany for efficiency
            mysql_cursor.executemany(insert_sql, data)
            mysql_conn.commit()

            row_count = len(rows)
            total_rows += row_count
            print(f"  {table}: {row_count} rows migrated")

        except Exception as e:
            errors.append((table, str(e)))
            print(f"  {table}: ERROR - {e}")

    # Re-enable foreign key checks
    mysql_cursor.execute('SET FOREIGN_KEY_CHECKS = 1')
    mysql_conn.commit()

    # Verify row counts
    print("\n" + "=" * 60)
    print("  Verification")
    print("=" * 60)

    mismatch = False
    for table in TABLES_IN_ORDER:
        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute(f'SELECT COUNT(*) FROM {table}')
        sqlite_count = sqlite_cursor.fetchone()[0]

        mysql_cursor.execute(f'SELECT COUNT(*) as cnt FROM {table}')
        mysql_count = mysql_cursor.fetchone()['cnt']

        status = "OK" if sqlite_count == mysql_count else "MISMATCH"
        if status == "MISMATCH":
            mismatch = True
        print(f"  {table}: SQLite={sqlite_count}, MySQL={mysql_count} [{status}]")

    # Cleanup
    sqlite_conn.close()
    mysql_conn.close()

    # Summary
    print("\n" + "=" * 60)
    print("  Summary")
    print("=" * 60)
    print(f"\n  Total rows migrated: {total_rows}")

    if errors:
        print(f"\n  Errors ({len(errors)}):")
        for table, error in errors:
            print(f"    - {table}: {error}")

    if mismatch:
        print("\n  WARNING: Row count mismatches detected! Review the errors above.")
    else:
        print("\n  Migration completed successfully!")

    print()


if __name__ == '__main__':
    migrate()
