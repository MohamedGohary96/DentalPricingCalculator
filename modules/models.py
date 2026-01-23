"""
Models Module - Data access and business logic for Dental Pricing Calculator
Multi-tenant SaaS version with clinic isolation
"""

from .database import get_connection, dict_from_row, hash_password, verify_password
import secrets
import re
from datetime import datetime, timedelta


# ============== Clinic Management ==============

def create_clinic(name, email, phone=None, address=None, city=None, country='Egypt'):
    """Create a new clinic and return clinic dict"""
    conn = get_connection()
    cursor = conn.cursor()

    # Generate unique slug from name
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    base_slug = slug
    counter = 1

    while True:
        cursor.execute('SELECT id FROM clinics WHERE slug = ?', (slug,))
        if not cursor.fetchone():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    cursor.execute('''
        INSERT INTO clinics (name, slug, email, phone, address, city, country)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (name, slug, email, phone, address, city, country))
    clinic_id = cursor.lastrowid

    # Create default settings for the clinic
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

    cursor.execute('SELECT * FROM clinics WHERE id = ?', (clinic_id,))
    clinic = dict_from_row(cursor.fetchone())
    conn.close()

    return clinic


def get_clinic_by_id(clinic_id):
    """Get clinic by ID"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM clinics WHERE id = ?', (clinic_id,))
    clinic = dict_from_row(cursor.fetchone())
    conn.close()
    return clinic


def get_clinic_by_slug(slug):
    """Get clinic by slug"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM clinics WHERE slug = ?', (slug,))
    clinic = dict_from_row(cursor.fetchone())
    conn.close()
    return clinic


def update_clinic(clinic_id, **kwargs):
    """Update clinic details"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at', 'slug']:  # Don't allow slug change
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.append(clinic_id)
        cursor.execute(f"UPDATE clinics SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        conn.commit()

    conn.close()
    return True


# ============== Authentication ==============

def authenticate_user(username, password):
    """Authenticate user and return user dict with clinic info or None"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT u.*, c.name as clinic_name, c.slug as clinic_slug
        FROM users u
        LEFT JOIN clinics c ON u.clinic_id = c.id
        WHERE u.username = ? AND u.is_active = 1
    ''', (username,))
    row = cursor.fetchone()
    conn.close()

    if row and verify_password(password, row['password_hash']):
        user = dict_from_row(row)
        # Check if clinic is active
        if user.get('clinic_id'):
            clinic = get_clinic_by_id(user['clinic_id'])
            if not clinic or not clinic.get('is_active'):
                return None
        return user
    return None


def create_user(clinic_id, username, password, first_name, last_name, email, role='staff'):
    """Create a new user for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()

    password_hash = hash_password(password)
    cursor.execute('''
        INSERT INTO users (clinic_id, username, password_hash, first_name, last_name, email, role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (clinic_id, username, password_hash, first_name, last_name, email, role))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id


def get_clinic_users(clinic_id):
    """Get all users for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, clinic_id, username, first_name, last_name, email, role, is_active, created_at
        FROM users WHERE clinic_id = ? ORDER BY first_name
    ''', (clinic_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def update_user(user_id, clinic_id, **kwargs):
    """Update user (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()

    # Verify user belongs to clinic
    cursor.execute('SELECT id FROM users WHERE id = ? AND clinic_id = ?', (user_id, clinic_id))
    if not cursor.fetchone():
        conn.close()
        return False

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at', 'clinic_id', 'password_hash']:
            if key == 'password':
                fields.append('password_hash = ?')
                values.append(hash_password(value))
            else:
                fields.append(f'{key} = ?')
                values.append(value)

    if fields:
        values.append(user_id)
        cursor.execute(f"UPDATE users SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        conn.commit()

    conn.close()
    return True


def register_clinic_with_owner(clinic_name, clinic_email, clinic_phone, clinic_address, clinic_city,
                                owner_username, owner_password, owner_first_name, owner_last_name, owner_email):
    """Register a new clinic with its owner account"""
    clinic = create_clinic(clinic_name, clinic_email, clinic_phone, clinic_address, clinic_city)
    user_id = create_user(clinic['id'], owner_username, owner_password, owner_first_name, owner_last_name, owner_email, 'owner')
    return {'clinic': clinic, 'user_id': user_id}


# ============== Global Settings ==============

def get_global_settings(clinic_id):
    """Get global settings for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM global_settings WHERE clinic_id = ?', (clinic_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        # Create default settings for the clinic
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO global_settings (clinic_id, currency, vat_percent, default_profit_percent, rounding_nearest)
            VALUES (?, 'EGP', 0, 40, 5)
        ''', (clinic_id,))
        conn.commit()
        conn.close()
        return get_global_settings(clinic_id)

    return dict_from_row(row)


def update_global_settings(clinic_id, **kwargs):
    """Update global settings for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key != 'clinic_id':
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.append(clinic_id)
        cursor.execute(f"UPDATE global_settings SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE clinic_id = ?", values)
        conn.commit()

    conn.close()
    return True


# ============== Fixed Costs ==============

def get_all_fixed_costs(clinic_id):
    """Get all fixed costs for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM fixed_costs WHERE clinic_id = ? ORDER BY category', (clinic_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def create_fixed_cost(clinic_id, category, monthly_amount, included=1, notes=''):
    """Create new fixed cost for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO fixed_costs (clinic_id, category, monthly_amount, included, notes)
        VALUES (?, ?, ?, ?, ?)
    ''', (clinic_id, category, monthly_amount, included, notes))
    cost_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return cost_id


def update_fixed_cost(cost_id, clinic_id, **kwargs):
    """Update fixed cost (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at', 'clinic_id']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.extend([cost_id, clinic_id])
        cursor.execute(f"UPDATE fixed_costs SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_fixed_cost(cost_id, clinic_id):
    """Delete fixed cost (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM fixed_costs WHERE id = ? AND clinic_id = ?', (cost_id, clinic_id))
    conn.commit()
    conn.close()
    return True


# ============== Salaries ==============

def get_all_salaries(clinic_id):
    """Get all salaries for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM salaries WHERE clinic_id = ? ORDER BY role_name', (clinic_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def create_salary(clinic_id, role_name, monthly_salary, included=1, notes=''):
    """Create new salary entry for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO salaries (clinic_id, role_name, monthly_salary, included, notes)
        VALUES (?, ?, ?, ?, ?)
    ''', (clinic_id, role_name, monthly_salary, included, notes))
    salary_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return salary_id


def update_salary(salary_id, clinic_id, **kwargs):
    """Update salary (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at', 'clinic_id']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.extend([salary_id, clinic_id])
        cursor.execute(f"UPDATE salaries SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_salary(salary_id, clinic_id):
    """Delete salary (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM salaries WHERE id = ? AND clinic_id = ?', (salary_id, clinic_id))
    conn.commit()
    conn.close()
    return True


# ============== Equipment ==============

def get_all_equipment(clinic_id):
    """Get all equipment for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM equipment WHERE clinic_id = ? ORDER BY asset_name', (clinic_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def create_equipment(clinic_id, asset_name, purchase_cost, life_years, allocation_type, monthly_usage_hours=None):
    """Create new equipment for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO equipment (clinic_id, asset_name, purchase_cost, life_years, allocation_type, monthly_usage_hours)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (clinic_id, asset_name, purchase_cost, life_years, allocation_type, monthly_usage_hours))
    equipment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return equipment_id


def update_equipment(equipment_id, clinic_id, **kwargs):
    """Update equipment (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at', 'clinic_id']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.extend([equipment_id, clinic_id])
        cursor.execute(f"UPDATE equipment SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_equipment(equipment_id, clinic_id):
    """Delete equipment (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM equipment WHERE id = ? AND clinic_id = ?', (equipment_id, clinic_id))
    conn.commit()
    conn.close()
    return True


# ============== Clinic Capacity ==============

def get_clinic_capacity(clinic_id):
    """Get clinic capacity settings for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM clinic_capacity WHERE clinic_id = ?', (clinic_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        # Create default capacity for the clinic
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO clinic_capacity (clinic_id, chairs, days_per_month, hours_per_day, utilization_percent)
            VALUES (?, 1, 24, 8, 80)
        ''', (clinic_id,))
        conn.commit()
        conn.close()
        return get_clinic_capacity(clinic_id)

    return dict_from_row(row)


def update_clinic_capacity(clinic_id, **kwargs):
    """Update clinic capacity for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key != 'clinic_id':
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.append(clinic_id)
        cursor.execute(f"UPDATE clinic_capacity SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE clinic_id = ?", values)
        conn.commit()

    conn.close()
    return True


# ============== Consumables ==============

def get_all_consumables(clinic_id):
    """Get all consumables for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM consumables WHERE clinic_id = ? ORDER BY item_name', (clinic_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def create_consumable(clinic_id, item_name, pack_cost, cases_per_pack, units_per_case=1):
    """Create new consumable for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO consumables (clinic_id, item_name, pack_cost, cases_per_pack, units_per_case)
        VALUES (?, ?, ?, ?, ?)
    ''', (clinic_id, item_name, pack_cost, cases_per_pack, units_per_case))
    consumable_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return consumable_id


def update_consumable(consumable_id, clinic_id, **kwargs):
    """Update consumable (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at', 'clinic_id']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.extend([consumable_id, clinic_id])
        cursor.execute(f"UPDATE consumables SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_consumable(consumable_id, clinic_id):
    """Delete consumable (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM consumables WHERE id = ? AND clinic_id = ?', (consumable_id, clinic_id))
    conn.commit()
    conn.close()
    return True


# ============== Services ==============

def get_all_services(clinic_id):
    """Get all services for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT s.*, e.asset_name as equipment_name
        FROM services s
        LEFT JOIN equipment e ON s.equipment_id = e.id
        WHERE s.clinic_id = ?
        ORDER BY s.name
    ''', (clinic_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def get_service_by_id(service_id, clinic_id):
    """Get service by ID with consumables (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM services WHERE id = ? AND clinic_id = ?', (service_id, clinic_id))
    service = dict_from_row(cursor.fetchone())

    if service:
        # Get consumables for this service
        cursor.execute('''
            SELECT sc.*, c.item_name, c.pack_cost, c.cases_per_pack, c.units_per_case
            FROM service_consumables sc
            JOIN consumables c ON sc.consumable_id = c.id
            WHERE sc.service_id = ?
        ''', (service_id,))
        service['consumables'] = [dict_from_row(r) for r in cursor.fetchall()]

    conn.close()
    return service


def create_service(clinic_id, name, chair_time_hours, doctor_hourly_fee, use_default_profit=1,
                   custom_profit_percent=None, equipment_id=None, equipment_hours_used=None, current_price=None,
                   doctor_fee_type='hourly', doctor_fixed_fee=0, doctor_percentage=0):
    """Create new service for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO services (clinic_id, name, chair_time_hours, doctor_hourly_fee, use_default_profit,
                             custom_profit_percent, equipment_id, equipment_hours_used, current_price,
                             doctor_fee_type, doctor_fixed_fee, doctor_percentage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (clinic_id, name, chair_time_hours, doctor_hourly_fee, use_default_profit,
          custom_profit_percent, equipment_id, equipment_hours_used, current_price,
          doctor_fee_type, doctor_fixed_fee, doctor_percentage))
    service_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return service_id


def update_service(service_id, clinic_id, **kwargs):
    """Update service (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at', 'consumables', 'clinic_id']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.extend([service_id, clinic_id])
        cursor.execute(f"UPDATE services SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_service(service_id, clinic_id):
    """Delete service (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM services WHERE id = ? AND clinic_id = ?', (service_id, clinic_id))
    conn.commit()
    conn.close()
    return True


def add_service_consumable(service_id, consumable_id, quantity):
    """Add consumable to service"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO service_consumables (service_id, consumable_id, quantity)
        VALUES (?, ?, ?)
    ''', (service_id, consumable_id, quantity))
    conn.commit()
    conn.close()
    return True


def remove_service_consumable(service_id, consumable_id):
    """Remove consumable from service"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        DELETE FROM service_consumables
        WHERE service_id = ? AND consumable_id = ?
    ''', (service_id, consumable_id))
    conn.commit()
    conn.close()
    return True


def update_service_consumables(service_id, consumables):
    """Update all consumables for a service"""
    conn = get_connection()
    cursor = conn.cursor()

    # Delete existing
    cursor.execute('DELETE FROM service_consumables WHERE service_id = ?', (service_id,))

    # Insert new
    for c in consumables:
        cursor.execute('''
            INSERT INTO service_consumables (service_id, consumable_id, quantity)
            VALUES (?, ?, ?)
        ''', (service_id, c['consumable_id'], c['quantity']))

    conn.commit()
    conn.close()
    return True


# ============== Price Calculations ==============

def calculate_service_price(service_id, clinic_id):
    """Calculate complete price breakdown for a service"""
    service = get_service_by_id(service_id, clinic_id)
    if not service:
        return None

    settings = get_global_settings(clinic_id)
    capacity = get_clinic_capacity(clinic_id)

    # Calculate fixed costs pool
    fixed_costs = get_all_fixed_costs(clinic_id)
    salaries = get_all_salaries(clinic_id)
    equipment_list = get_all_equipment(clinic_id)

    total_fixed = sum(c['monthly_amount'] for c in fixed_costs if c['included'])
    total_salaries = sum(s['monthly_salary'] for s in salaries if s['included'])

    # Fixed equipment depreciation
    fixed_depreciation = 0
    for eq in equipment_list:
        if eq['allocation_type'] == 'fixed':
            monthly_depreciation = eq['purchase_cost'] / (eq['life_years'] * 12)
            fixed_depreciation += monthly_depreciation

    total_monthly_fixed = total_fixed + total_salaries + fixed_depreciation

    # Calculate effective chair hours
    theoretical_hours = capacity['chairs'] * capacity['days_per_month'] * capacity['hours_per_day']
    effective_hours = theoretical_hours * (capacity['utilization_percent'] / 100)

    # Chair hourly rate
    chair_hourly_rate = total_monthly_fixed / effective_hours if effective_hours > 0 else 0

    # Chair time cost
    chair_time_cost = chair_hourly_rate * service['chair_time_hours']

    # Doctor fee (based on fee type)
    doctor_fee_type = service.get('doctor_fee_type', 'hourly')
    if doctor_fee_type == 'hourly':
        doctor_fee = service['doctor_hourly_fee'] * service['chair_time_hours']
    elif doctor_fee_type == 'fixed':
        doctor_fee = service.get('doctor_fixed_fee', 0)
    else:  # percentage - will be calculated after final price
        doctor_fee = 0

    # Equipment cost (per-hour equipment)
    equipment_cost = 0
    if service['equipment_id'] and service['equipment_hours_used']:
        for eq in equipment_list:
            if eq['id'] == service['equipment_id'] and eq['allocation_type'] == 'per-hour':
                monthly_depreciation = eq['purchase_cost'] / (eq['life_years'] * 12)
                if eq['monthly_usage_hours'] and eq['monthly_usage_hours'] > 0:
                    hourly_rate = monthly_depreciation / eq['monthly_usage_hours']
                    equipment_cost = hourly_rate * service['equipment_hours_used']

    # Direct materials (consumables)
    consumables = service.get('consumables', [])
    materials_cost = 0
    for c in consumables:
        per_case_cost = (c['pack_cost'] / c['cases_per_pack'] / c['units_per_case'])
        materials_cost += per_case_cost * c['quantity']

    # Total cost (initial calculation)
    total_cost = chair_time_cost + doctor_fee + equipment_cost + materials_cost

    # Profit
    profit_percent = service['custom_profit_percent'] if not service['use_default_profit'] else settings['default_profit_percent']

    # For percentage-based doctor fee, we need to calculate differently
    # Final price = (costs_without_doctor + doctor_fee) * (1 + profit%) * (1 + vat%)
    # If doctor_fee = percentage% of final_price, then:
    # final_price = costs_without_doctor * (1 + profit%) * (1 + vat%) / (1 - percentage%)

    if doctor_fee_type == 'percentage':
        doctor_percentage = service.get('doctor_percentage', 0) / 100  # Convert to decimal
        costs_without_doctor = chair_time_cost + equipment_cost + materials_cost

        # Calculate base price without doctor fee
        profit_multiplier = 1 + (profit_percent / 100)
        vat_multiplier = 1 + (settings['vat_percent'] / 100)

        # Final price formula with doctor fee as percentage
        final_price = (costs_without_doctor * profit_multiplier * vat_multiplier) / (1 - doctor_percentage)

        # Back-calculate components
        doctor_fee = final_price * doctor_percentage
        price_before_vat = final_price / vat_multiplier
        vat_amount = final_price - price_before_vat
        total_cost = price_before_vat / profit_multiplier
        profit_amount = price_before_vat - total_cost
    else:
        # Standard calculation for hourly and fixed fee types
        profit_amount = total_cost * (profit_percent / 100)
        price_before_vat = total_cost + profit_amount
        vat_amount = price_before_vat * (settings['vat_percent'] / 100)
        final_price = price_before_vat + vat_amount

    # Rounded price
    rounding = settings['rounding_nearest']
    rounded_price = round(final_price / rounding) * rounding if rounding > 0 else final_price

    return {
        'service_name': service['name'],
        'chair_time_cost': round(chair_time_cost, 2),
        'doctor_fee': round(doctor_fee, 2),
        'equipment_cost': round(equipment_cost, 2),
        'materials_cost': round(materials_cost, 2),
        'total_cost': round(total_cost, 2),
        'profit_percent': profit_percent,
        'profit_amount': round(profit_amount, 2),
        'price_before_vat': round(price_before_vat, 2),
        'vat_percent': settings['vat_percent'],
        'vat_amount': round(vat_amount, 2),
        'final_price': round(final_price, 2),
        'rounded_price': round(rounded_price, 2),
        'currency': settings['currency'],
        'chair_hourly_rate': round(chair_hourly_rate, 2),
        'effective_hours': round(effective_hours, 2),
        'current_price': service.get('current_price'),
        # Breakdown of monthly fixed costs for chair rate calculation
        'monthly_fixed_costs': round(total_fixed, 2),
        'monthly_salaries': round(total_salaries, 2),
        'monthly_depreciation': round(fixed_depreciation, 2),
        'total_monthly_fixed': round(total_monthly_fixed, 2)
    }


def calculate_all_services(clinic_id):
    """Calculate prices for all services in a clinic"""
    services = get_all_services(clinic_id)
    results = []

    for service in services:
        price_data = calculate_service_price(service['id'], clinic_id)
        if price_data:
            results.append({
                'id': service['id'],
                **price_data
            })

    return results
