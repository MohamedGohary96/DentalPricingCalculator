"""
Models Module - Data access and business logic for Dental Pricing Calculator
"""

from .database import get_connection, dict_from_row, hash_password, verify_password
import secrets
from datetime import datetime, timedelta


# ============== Authentication ==============

def authenticate_user(username, password):
    """Authenticate user and return user dict or None"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    conn.close()

    if row and verify_password(password, row['password_hash']):
        return dict_from_row(row)
    return None


# ============== Global Settings ==============

def get_global_settings():
    """Get global settings"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM global_settings WHERE id = 1')
    row = cursor.fetchone()
    conn.close()

    if not row:
        # Create default settings
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO global_settings (id, currency, vat_percent, default_profit_percent, rounding_nearest)
            VALUES (1, 'EGP', 0, 40, 5)
        ''')
        conn.commit()
        conn.close()
        return get_global_settings()

    return dict_from_row(row)


def update_global_settings(**kwargs):
    """Update global settings"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        fields.append(f'{key} = ?')
        values.append(value)

    if fields:
        values.append(1)  # id = 1
        cursor.execute(f"UPDATE global_settings SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        conn.commit()

    conn.close()
    return True


# ============== Fixed Costs ==============

def get_all_fixed_costs():
    """Get all fixed costs"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM fixed_costs ORDER BY category')
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def create_fixed_cost(category, monthly_amount, included=1, notes=''):
    """Create new fixed cost"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO fixed_costs (category, monthly_amount, included, notes)
        VALUES (?, ?, ?, ?)
    ''', (category, monthly_amount, included, notes))
    cost_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return cost_id


def update_fixed_cost(cost_id, **kwargs):
    """Update fixed cost"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.append(cost_id)
        cursor.execute(f"UPDATE fixed_costs SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_fixed_cost(cost_id):
    """Delete fixed cost"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM fixed_costs WHERE id = ?', (cost_id,))
    conn.commit()
    conn.close()
    return True


# ============== Salaries ==============

def get_all_salaries():
    """Get all salaries"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM salaries ORDER BY role_name')
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def create_salary(role_name, monthly_salary, included=1, notes=''):
    """Create new salary entry"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO salaries (role_name, monthly_salary, included, notes)
        VALUES (?, ?, ?, ?)
    ''', (role_name, monthly_salary, included, notes))
    salary_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return salary_id


def update_salary(salary_id, **kwargs):
    """Update salary"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.append(salary_id)
        cursor.execute(f"UPDATE salaries SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_salary(salary_id):
    """Delete salary"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM salaries WHERE id = ?', (salary_id,))
    conn.commit()
    conn.close()
    return True


# ============== Equipment ==============

def get_all_equipment():
    """Get all equipment"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM equipment ORDER BY asset_name')
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def create_equipment(asset_name, purchase_cost, life_years, allocation_type, monthly_usage_hours=None):
    """Create new equipment"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO equipment (asset_name, purchase_cost, life_years, allocation_type, monthly_usage_hours)
        VALUES (?, ?, ?, ?, ?)
    ''', (asset_name, purchase_cost, life_years, allocation_type, monthly_usage_hours))
    equipment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return equipment_id


def update_equipment(equipment_id, **kwargs):
    """Update equipment"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.append(equipment_id)
        cursor.execute(f"UPDATE equipment SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_equipment(equipment_id):
    """Delete equipment"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM equipment WHERE id = ?', (equipment_id,))
    conn.commit()
    conn.close()
    return True


# ============== Clinic Capacity ==============

def get_clinic_capacity():
    """Get clinic capacity settings"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM clinic_capacity WHERE id = 1')
    row = cursor.fetchone()
    conn.close()

    if not row:
        # Create default capacity
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO clinic_capacity (id, chairs, days_per_month, hours_per_day, utilization_percent)
            VALUES (1, 1, 24, 8, 80)
        ''')
        conn.commit()
        conn.close()
        return get_clinic_capacity()

    return dict_from_row(row)


def update_clinic_capacity(**kwargs):
    """Update clinic capacity"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        fields.append(f'{key} = ?')
        values.append(value)

    if fields:
        values.append(1)  # id = 1
        cursor.execute(f"UPDATE clinic_capacity SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        conn.commit()

    conn.close()
    return True


# ============== Consumables ==============

def get_all_consumables():
    """Get all consumables"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM consumables ORDER BY item_name')
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def create_consumable(item_name, pack_cost, cases_per_pack, units_per_case=1):
    """Create new consumable"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO consumables (item_name, pack_cost, cases_per_pack, units_per_case)
        VALUES (?, ?, ?, ?)
    ''', (item_name, pack_cost, cases_per_pack, units_per_case))
    consumable_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return consumable_id


def update_consumable(consumable_id, **kwargs):
    """Update consumable"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.append(consumable_id)
        cursor.execute(f"UPDATE consumables SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_consumable(consumable_id):
    """Delete consumable"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM consumables WHERE id = ?', (consumable_id,))
    conn.commit()
    conn.close()
    return True


# ============== Services ==============

def get_all_services():
    """Get all services"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT s.*, e.asset_name as equipment_name
        FROM services s
        LEFT JOIN equipment e ON s.equipment_id = e.id
        ORDER BY s.name
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def get_service_by_id(service_id):
    """Get service by ID with consumables"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM services WHERE id = ?', (service_id,))
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


def create_service(name, chair_time_hours, doctor_hourly_fee, use_default_profit=1,
                   custom_profit_percent=None, equipment_id=None, equipment_hours_used=None):
    """Create new service"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO services (name, chair_time_hours, doctor_hourly_fee, use_default_profit,
                             custom_profit_percent, equipment_id, equipment_hours_used)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (name, chair_time_hours, doctor_hourly_fee, use_default_profit,
          custom_profit_percent, equipment_id, equipment_hours_used))
    service_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return service_id


def update_service(service_id, **kwargs):
    """Update service"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at', 'consumables']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.append(service_id)
        cursor.execute(f"UPDATE services SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_service(service_id):
    """Delete service"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM services WHERE id = ?', (service_id,))
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

def calculate_service_price(service_id):
    """Calculate complete price breakdown for a service"""
    service = get_service_by_id(service_id)
    if not service:
        return None

    settings = get_global_settings()
    capacity = get_clinic_capacity()

    # Calculate fixed costs pool
    fixed_costs = get_all_fixed_costs()
    salaries = get_all_salaries()
    equipment_list = get_all_equipment()

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

    # Doctor fee
    doctor_fee = service['doctor_hourly_fee'] * service['chair_time_hours']

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
        per_case_cost = (c['pack_cost'] / c['cases_per_pack']) * c['units_per_case']
        materials_cost += per_case_cost * c['quantity']

    # Total cost
    total_cost = chair_time_cost + doctor_fee + equipment_cost + materials_cost

    # Profit
    profit_percent = service['custom_profit_percent'] if not service['use_default_profit'] else settings['default_profit_percent']
    profit_amount = total_cost * (profit_percent / 100)

    # Price before VAT
    price_before_vat = total_cost + profit_amount

    # VAT
    vat_amount = price_before_vat * (settings['vat_percent'] / 100)

    # Final price
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
        'effective_hours': round(effective_hours, 2)
    }


def calculate_all_services():
    """Calculate prices for all services"""
    services = get_all_services()
    results = []

    for service in services:
        price_data = calculate_service_price(service['id'])
        if price_data:
            results.append({
                'id': service['id'],
                **price_data
            })

    return results
