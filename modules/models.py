"""
Models Module - Data access and business logic for Dental Pricing Calculator
Multi-tenant SaaS version with clinic isolation
"""

from .database import get_connection, dict_from_row, hash_password, verify_password, create_default_categories
import secrets
import hashlib
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
        INSERT INTO clinics (name, slug, email, phone, address, city, country, subscription_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'trial')
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

    # Create default service categories
    create_default_categories(clinic_id, conn)

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
    """Authenticate user and return user dict with clinic info or None

    Note: Clinic active status is now handled through subscription system,
    not authentication. Deactivated clinics can still login but see limited views.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT u.*, c.name as clinic_name, c.slug as clinic_slug, c.is_active as clinic_is_active
        FROM users u
        LEFT JOIN clinics c ON u.clinic_id = c.id
        WHERE u.username = ? AND u.is_active = 1
    ''', (username,))
    row = cursor.fetchone()
    conn.close()

    if row and verify_password(password, row['password_hash']):
        user = dict_from_row(row)
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

    settings = dict_from_row(row)

    # Calculate total_overhead_per_hour (chair hourly rate)
    fixed_costs = get_all_fixed_costs(clinic_id)
    salaries = get_all_salaries(clinic_id)
    equipment_list = get_all_equipment(clinic_id)
    capacity = get_clinic_capacity(clinic_id)

    # Calculate total monthly fixed costs
    total_fixed = sum(c['monthly_amount'] for c in fixed_costs if c['included'])
    total_salaries = sum(s['monthly_salary'] for s in salaries if s['included'])

    # Fixed equipment depreciation
    fixed_depreciation = 0
    for eq in equipment_list:
        if eq['allocation_type'] == 'fixed':
            monthly_depreciation = eq['purchase_cost'] / (eq['life_years'] * 12)
            fixed_depreciation += monthly_depreciation

    total_monthly_fixed = total_fixed + total_salaries + fixed_depreciation

    # Calculate effective hours
    theoretical_hours = capacity['chairs'] * capacity['days_per_month'] * capacity['hours_per_day']
    effective_hours = theoretical_hours * (capacity['utilization_percent'] / 100)

    # Calculate overhead per hour
    chair_hourly_rate = total_monthly_fixed / effective_hours if effective_hours > 0 else 0
    settings['total_overhead_per_hour'] = round(chair_hourly_rate, 2)

    return settings


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


def create_consumable(clinic_id, item_name, pack_cost, cases_per_pack, units_per_case=1, name_ar=None):
    """Create new consumable for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO consumables (clinic_id, item_name, pack_cost, cases_per_pack, units_per_case, name_ar)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (clinic_id, item_name, pack_cost, cases_per_pack, units_per_case, name_ar))
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
    try:
        cursor = conn.cursor()
        # First delete from service_consumables to avoid foreign key constraint
        cursor.execute('DELETE FROM service_consumables WHERE consumable_id = ?', (consumable_id,))
        # Then delete the consumable itself
        cursor.execute('DELETE FROM consumables WHERE id = ? AND clinic_id = ?', (consumable_id, clinic_id))
        conn.commit()
        return True
    finally:
        conn.close()


# ============== Lab Materials ==============

def get_all_materials(clinic_id):
    """Get all lab materials for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM lab_materials WHERE clinic_id = ? ORDER BY material_name', (clinic_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def create_material(clinic_id, material_name, unit_cost, lab_name=None, description=None, name_ar=None):
    """Create new lab material for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO lab_materials (clinic_id, material_name, lab_name, unit_cost, description, name_ar)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (clinic_id, material_name, lab_name, unit_cost, description, name_ar))
    material_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return material_id


def update_material(material_id, clinic_id, **kwargs):
    """Update lab material (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at', 'clinic_id']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.extend([material_id, clinic_id])
        cursor.execute(f"UPDATE lab_materials SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_material(material_id, clinic_id):
    """Delete lab material (must belong to clinic)"""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        # First delete from service_materials to avoid foreign key constraint
        cursor.execute('DELETE FROM service_materials WHERE material_id = ?', (material_id,))
        # Then delete the material itself
        cursor.execute('DELETE FROM lab_materials WHERE id = ? AND clinic_id = ?', (material_id, clinic_id))
        conn.commit()
        return True
    finally:
        conn.close()


# ============== Service Categories ==============

def get_all_categories(clinic_id):
    """Get all service categories for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM service_categories WHERE clinic_id = ? AND is_active = 1 ORDER BY display_order, name', (clinic_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def get_category_by_id(category_id, clinic_id):
    """Get a category by ID (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM service_categories WHERE id = ? AND clinic_id = ?', (category_id, clinic_id))
    row = cursor.fetchone()
    conn.close()
    return dict_from_row(row)


def create_category(clinic_id, name, display_order=None):
    """Create new service category for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()

    if display_order is None:
        cursor.execute('SELECT MAX(display_order) FROM service_categories WHERE clinic_id = ?', (clinic_id,))
        max_order = cursor.fetchone()[0]
        display_order = (max_order or 0) + 1

    cursor.execute('''
        INSERT INTO service_categories (clinic_id, name, display_order)
        VALUES (?, ?, ?)
    ''', (clinic_id, name, display_order))
    category_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return category_id


def update_category(category_id, clinic_id, **kwargs):
    """Update category (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key not in ['id', 'created_at', 'clinic_id']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.extend([category_id, clinic_id])
        cursor.execute(f"UPDATE service_categories SET {', '.join(fields)} WHERE id = ? AND clinic_id = ?", values)
        conn.commit()

    conn.close()
    return True


def delete_category(category_id, clinic_id):
    """Soft delete category (set is_active = 0) and unlink services"""
    conn = get_connection()
    cursor = conn.cursor()
    # Soft delete the category
    cursor.execute('UPDATE service_categories SET is_active = 0 WHERE id = ? AND clinic_id = ?', (category_id, clinic_id))
    # Unlink services from this category
    cursor.execute('UPDATE services SET category_id = NULL WHERE category_id = ? AND clinic_id = ?', (category_id, clinic_id))
    conn.commit()
    conn.close()
    return True


# ============== Services ==============

def get_all_services(clinic_id):
    """Get all services for a clinic with category info"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT s.*, e.asset_name as equipment_name, sc.name as category_name
        FROM services s
        LEFT JOIN equipment e ON s.equipment_id = e.id
        LEFT JOIN service_categories sc ON s.category_id = sc.id
        WHERE s.clinic_id = ?
        ORDER BY sc.display_order, sc.name, s.name
    ''', (clinic_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def get_service_by_id(service_id, clinic_id):
    """Get service by ID with consumables and equipment (must belong to clinic)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM services WHERE id = ? AND clinic_id = ?', (service_id, clinic_id))
    service = dict_from_row(cursor.fetchone())

    if service:
        # Get consumables for this service
        cursor.execute('''
            SELECT sc.*, c.item_name, c.pack_cost, c.cases_per_pack, c.units_per_case, c.name_ar
            FROM service_consumables sc
            JOIN consumables c ON sc.consumable_id = c.id
            WHERE sc.service_id = ?
        ''', (service_id,))
        service['consumables'] = [dict_from_row(r) for r in cursor.fetchall()]

        # Get materials for this service
        cursor.execute('''
            SELECT sm.*, m.material_name, m.lab_name, m.unit_cost, m.description, m.name_ar
            FROM service_materials sm
            JOIN lab_materials m ON sm.material_id = m.id
            WHERE sm.service_id = ?
        ''', (service_id,))
        service['materials'] = [dict_from_row(r) for r in cursor.fetchall()]

        # Get equipment for this service (from service_equipment table)
        cursor.execute('''
            SELECT se.*, e.asset_name, e.purchase_cost, e.life_years, e.allocation_type, e.monthly_usage_hours
            FROM service_equipment se
            JOIN equipment e ON se.equipment_id = e.id
            WHERE se.service_id = ?
        ''', (service_id,))
        service['equipment_list'] = [dict_from_row(r) for r in cursor.fetchall()]

    conn.close()
    return service


def create_service(clinic_id, name, chair_time_hours, doctor_hourly_fee, use_default_profit=1,
                   custom_profit_percent=None, equipment_id=None, equipment_hours_used=None, current_price=None,
                   doctor_fee_type='hourly', doctor_fixed_fee=0, doctor_percentage=0, category_id=None, name_ar=None):
    """Create new service for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO services (clinic_id, name, chair_time_hours, doctor_hourly_fee, use_default_profit,
                             custom_profit_percent, equipment_id, equipment_hours_used, current_price,
                             doctor_fee_type, doctor_fixed_fee, doctor_percentage, category_id, name_ar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (clinic_id, name, chair_time_hours, doctor_hourly_fee, use_default_profit,
          custom_profit_percent, equipment_id, equipment_hours_used, current_price,
          doctor_fee_type, doctor_fixed_fee, doctor_percentage, category_id, name_ar))
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
    try:
        cursor = conn.cursor()
        # Explicitly delete child records first (even though CASCADE should handle it)
        cursor.execute('DELETE FROM service_consumables WHERE service_id = ?', (service_id,))
        cursor.execute('DELETE FROM service_materials WHERE service_id = ?', (service_id,))
        cursor.execute('DELETE FROM service_equipment WHERE service_id = ?', (service_id,))
        # Then delete the service itself
        cursor.execute('DELETE FROM services WHERE id = ? AND clinic_id = ?', (service_id, clinic_id))
        conn.commit()
        return True
    finally:
        conn.close()


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
    """Update all consumables for a service (with optional custom unit price)"""
    conn = get_connection()
    cursor = conn.cursor()

    # Delete existing
    cursor.execute('DELETE FROM service_consumables WHERE service_id = ?', (service_id,))

    # Insert new
    for c in consumables:
        custom_price = c.get('custom_unit_price')
        cursor.execute('''
            INSERT INTO service_consumables (service_id, consumable_id, quantity, custom_unit_price)
            VALUES (?, ?, ?, ?)
        ''', (service_id, c['consumable_id'], c['quantity'], custom_price))

    conn.commit()
    conn.close()
    return True


def add_service_material(service_id, material_id, quantity, custom_unit_price=None):
    """Add lab material to service"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO service_materials (service_id, material_id, quantity, custom_unit_price)
        VALUES (?, ?, ?, ?)
    ''', (service_id, material_id, quantity, custom_unit_price))
    conn.commit()
    conn.close()
    return True


def remove_service_material(service_id, material_id):
    """Remove lab material from service"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        DELETE FROM service_materials
        WHERE service_id = ? AND material_id = ?
    ''', (service_id, material_id))
    conn.commit()
    conn.close()
    return True


def update_service_materials(service_id, materials):
    """Update all lab materials for a service (with optional custom unit price)"""
    conn = get_connection()
    cursor = conn.cursor()

    # Delete existing
    cursor.execute('DELETE FROM service_materials WHERE service_id = ?', (service_id,))

    # Insert new
    for m in materials:
        custom_price = m.get('custom_unit_price')
        cursor.execute('''
            INSERT INTO service_materials (service_id, material_id, quantity, custom_unit_price)
            VALUES (?, ?, ?, ?)
        ''', (service_id, m['material_id'], m['quantity'], custom_price))

    conn.commit()
    conn.close()
    return True


def update_service_equipment(service_id, equipment_list):
    """Update all equipment for a service"""
    conn = get_connection()
    cursor = conn.cursor()

    # Delete existing
    cursor.execute('DELETE FROM service_equipment WHERE service_id = ?', (service_id,))

    # Insert new
    for eq in equipment_list:
        cursor.execute('''
            INSERT INTO service_equipment (service_id, equipment_id, hours_used)
            VALUES (?, ?, ?)
        ''', (service_id, eq['equipment_id'], eq['hours_used']))

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

    # Equipment cost (per-hour equipment) - supports multiple equipment from service_equipment table
    equipment_cost = 0
    service_equipment = service.get('equipment_list', [])

    # Also check legacy single equipment field for backward compatibility
    if not service_equipment and service.get('equipment_id') and service.get('equipment_hours_used'):
        for eq in equipment_list:
            if eq['id'] == service['equipment_id'] and eq['allocation_type'] == 'per-hour':
                monthly_depreciation = eq['purchase_cost'] / (eq['life_years'] * 12)
                if eq['monthly_usage_hours'] and eq['monthly_usage_hours'] > 0:
                    hourly_rate = monthly_depreciation / eq['monthly_usage_hours']
                    equipment_cost = hourly_rate * service['equipment_hours_used']
    else:
        # Calculate cost for each equipment in the service_equipment list
        for se in service_equipment:
            # Find the equipment details
            eq = next((e for e in equipment_list if e['id'] == se['equipment_id']), None)
            if eq and eq['allocation_type'] == 'per-hour':
                monthly_depreciation = eq['purchase_cost'] / (eq['life_years'] * 12)
                if eq['monthly_usage_hours'] and eq['monthly_usage_hours'] > 0:
                    hourly_rate = monthly_depreciation / eq['monthly_usage_hours']
                    equipment_cost += hourly_rate * se['hours_used']

    # Direct materials (consumables) - supports custom unit price per service
    consumables = service.get('consumables', [])
    consumables_cost = 0
    for c in consumables:
        # Use custom unit price if set, otherwise calculate from pack cost
        if c.get('custom_unit_price') is not None:
            unit_cost = c['custom_unit_price']
        else:
            unit_cost = c['pack_cost'] / c['cases_per_pack'] / c['units_per_case']
        consumables_cost += unit_cost * c['quantity']

    # Lab materials - supports custom unit price per service
    materials = service.get('materials', [])
    lab_materials_cost = 0
    for m in materials:
        # Use custom unit price if set, otherwise use the default unit cost
        if m.get('custom_unit_price') is not None:
            unit_cost = m['custom_unit_price']
        else:
            unit_cost = m['unit_cost']
        lab_materials_cost += unit_cost * m['quantity']

    # Total materials cost (consumables + lab materials)
    materials_cost = consumables_cost + lab_materials_cost

    # Total cost (initial calculation)
    total_cost = chair_time_cost + doctor_fee + equipment_cost + materials_cost

    # Profit
    profit_percent = service['custom_profit_percent'] if not service['use_default_profit'] else settings['default_profit_percent']

    # For percentage-based doctor fee, calculate from ROUNDED final price
    # rounded_price = (costs_without_doctor * (1 + profit%) * (1 + vat%)) / (1 - percentage%)
    # Then round it, and doctor_fee = rounded_price * percentage%

    if doctor_fee_type == 'percentage':
        doctor_percentage = service.get('doctor_percentage', 0) / 100  # Convert to decimal
        costs_without_doctor = chair_time_cost + equipment_cost + materials_cost

        # Calculate base price without doctor fee
        profit_multiplier = 1 + (profit_percent / 100)
        vat_multiplier = 1 + (settings['vat_percent'] / 100)

        # Final price formula with doctor fee as percentage of rounded price
        final_price_before_rounding = (costs_without_doctor * profit_multiplier * vat_multiplier) / (1 - doctor_percentage)

        # Round the price first
        rounding = settings['rounding_nearest']
        rounded_price = round(final_price_before_rounding / rounding) * rounding if rounding > 0 else final_price_before_rounding

        # Now calculate doctor fee from the ROUNDED price
        doctor_fee = rounded_price * doctor_percentage

        # Back-calculate other components from rounded price
        final_price = rounded_price
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
        'name_ar': service.get('name_ar', ''),
        'chair_time_cost': round(chair_time_cost, 2),
        'doctor_fee': round(doctor_fee, 2),
        'equipment_cost': round(equipment_cost, 2),
        'consumables_cost': round(consumables_cost, 2),
        'lab_materials_cost': round(lab_materials_cost, 2),
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
                'category_id': service.get('category_id'),
                'category_name': service.get('category_name'),
                **price_data
            })

    return results


# ============== Super Admin & Subscription ==============

def is_super_admin(user_id):
    """Check if user is a super admin"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT is_super_admin FROM users WHERE id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row and row['is_super_admin'] == 1


def get_all_clinics_admin():
    """Get all clinics with stats (super admin only)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT c.*,
               (SELECT COUNT(*) FROM users WHERE clinic_id = c.id AND is_active = 1) as user_count,
               (SELECT COUNT(*) FROM services WHERE clinic_id = c.id) as service_count
        FROM clinics c
        ORDER BY c.created_at DESC
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def get_clinic_payments(clinic_id):
    """Get payment history for a clinic"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT sp.*, u.first_name || ' ' || u.last_name as recorded_by_name
        FROM subscription_payments sp
        LEFT JOIN users u ON sp.recorded_by = u.id
        WHERE sp.clinic_id = ?
        ORDER BY sp.payment_date DESC, sp.created_at DESC
    ''', (clinic_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict_from_row(r) for r in rows]


def record_payment(clinic_id, amount, payment_date, payment_method, months_paid, recorded_by,
                   receipt_number=None, payment_notes=None, currency='EGP'):
    """Record a subscription payment and update clinic subscription"""
    conn = get_connection()
    cursor = conn.cursor()

    # Insert payment record
    cursor.execute('''
        INSERT INTO subscription_payments (clinic_id, amount, currency, payment_date, payment_method,
                                          months_paid, receipt_number, payment_notes, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (clinic_id, amount, currency, payment_date, payment_method, months_paid,
          receipt_number, payment_notes, recorded_by))
    payment_id = cursor.lastrowid

    # Calculate new expiry date
    cursor.execute('SELECT subscription_expires_at FROM clinics WHERE id = ?', (clinic_id,))
    row = cursor.fetchone()
    current_expiry = row['subscription_expires_at'] if row else None

    # Start from current expiry or today, whichever is later
    if current_expiry:
        from datetime import datetime
        try:
            expiry_date = datetime.strptime(current_expiry, '%Y-%m-%d').date()
            if expiry_date < datetime.now().date():
                expiry_date = datetime.now().date()
        except:
            expiry_date = datetime.now().date()
    else:
        expiry_date = datetime.now().date()

    # Add months (30 days per month)
    new_expiry = expiry_date + timedelta(days=30 * months_paid)

    # Update clinic subscription
    cursor.execute('''
        UPDATE clinics SET
            subscription_status = 'active',
            subscription_expires_at = ?,
            last_payment_date = ?,
            last_payment_amount = ?,
            grace_period_start = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (new_expiry.strftime('%Y-%m-%d'), payment_date, amount, clinic_id))

    conn.commit()
    conn.close()
    return {'payment_id': payment_id, 'new_expiry': new_expiry.strftime('%Y-%m-%d')}


def update_clinic_subscription(clinic_id, **kwargs):
    """Update clinic subscription fields"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in kwargs.items():
        if key in ['subscription_status', 'subscription_expires_at', 'subscription_plan', 'is_active', 'grace_period_start']:
            fields.append(f'{key} = ?')
            values.append(value)

    if fields:
        values.append(clinic_id)
        cursor.execute(f"UPDATE clinics SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
        conn.commit()

    conn.close()
    return True


def update_clinic_language(clinic_id, language):
    """Update clinic language preference"""
    if language not in ['en', 'ar']:
        return False
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE clinics SET language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (language, clinic_id))
    conn.commit()
    conn.close()
    return True


def get_clinic_language(clinic_id):
    """Get clinic language preference"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT language FROM clinics WHERE id = ?', (clinic_id,))
    row = cursor.fetchone()
    conn.close()
    return row['language'] if row and row['language'] else 'en'


def toggle_clinic_status(clinic_id):
    """Toggle clinic active status"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE clinics SET is_active = 1 - is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (clinic_id,))
    conn.commit()

    # Get new status
    cursor.execute('SELECT is_active FROM clinics WHERE id = ?', (clinic_id,))
    row = cursor.fetchone()
    conn.close()
    return row['is_active'] if row else None


def get_subscription_status(clinic_id):
    """Get detailed subscription status for a clinic"""
    # Trial configuration
    TRIAL_DAYS = 7
    MAX_TRIAL_SERVICES = 999999  # Unlimited services for trial users

    # Super admin clinic (id=1) always has permanent/infinite subscription
    if clinic_id == 1:
        return {
            'status': 'active',
            'days_remaining': 9999,
            'restriction_level': 'none',
            'expires_at': None,
            'is_permanent': True,
            'trial_days_remaining': 0,
            'services_used': 0,
            'max_trial_services': MAX_TRIAL_SERVICES
        }

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT subscription_status, subscription_expires_at, subscription_plan, grace_period_start, is_active, created_at
        FROM clinics WHERE id = ?
    ''', (clinic_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return {'status': 'unknown', 'days_remaining': 0, 'restriction_level': 'lockout'}

    clinic = dict_from_row(row)

    # Get service count for this clinic
    cursor.execute('SELECT COUNT(*) as count FROM services WHERE clinic_id = ?', (clinic_id,))
    services_used = cursor.fetchone()['count']
    conn.close()

    # Calculate trial days remaining
    trial_days_remaining = 0
    if clinic.get('created_at'):
        try:
            # Handle different datetime formats
            created_str = clinic['created_at']
            if ' ' in created_str:
                created_date = datetime.strptime(created_str.split('.')[0], '%Y-%m-%d %H:%M:%S').date()
            else:
                created_date = datetime.strptime(created_str, '%Y-%m-%d').date()
            trial_end_date = created_date + timedelta(days=TRIAL_DAYS)
            trial_days_remaining = (trial_end_date - datetime.now().date()).days
            trial_days_remaining = max(0, trial_days_remaining)
        except Exception as e:
            trial_days_remaining = 0

    # If clinic is deactivated by admin, treat as suspended/lockout
    if not clinic.get('is_active', 1):
        return {
            'status': 'suspended',
            'days_remaining': 0,
            'restriction_level': 'lockout',
            'expires_at': clinic['subscription_expires_at'],
            'is_suspended': True,
            'trial_days_remaining': trial_days_remaining,
            'services_used': services_used,
            'max_trial_services': MAX_TRIAL_SERVICES
        }

    status = clinic['subscription_status']
    expires_at = clinic['subscription_expires_at']
    grace_start = clinic['grace_period_start']

    # For trial status
    if status == 'trial':
        # Check if trial has expired (7 days) or service limit reached
        trial_expired = trial_days_remaining <= 0
        service_limit_reached = services_used >= MAX_TRIAL_SERVICES

        # If trial expired, treat as lockout
        if trial_expired:
            return {
                'status': 'expired',
                'days_remaining': 0,
                'restriction_level': 'lockout',
                'expires_at': expires_at,
                'trial_days_remaining': 0,
                'services_used': services_used,
                'max_trial_services': MAX_TRIAL_SERVICES,
                'trial_ended': True
            }

        return {
            'status': 'trial',
            'days_remaining': None,
            'restriction_level': 'trial',  # Price list restricted
            'expires_at': expires_at,
            'trial_days_remaining': trial_days_remaining,
            'services_used': services_used,
            'max_trial_services': MAX_TRIAL_SERVICES,
            'can_add_services': services_used < MAX_TRIAL_SERVICES
        }

    # Calculate days remaining for active subscriptions
    days_remaining = 0
    if expires_at:
        try:
            expiry_date = datetime.strptime(expires_at, '%Y-%m-%d').date()
            days_remaining = (expiry_date - datetime.now().date()).days
        except:
            pass

    # Determine restriction level
    if days_remaining > 7:
        restriction_level = 'none'
        status = 'active'
    elif days_remaining > 0:
        restriction_level = 'warning'
        status = 'active'
    elif days_remaining > -3:
        restriction_level = 'readonly'
        status = 'grace_period'
    else:
        restriction_level = 'lockout'
        status = 'expired'

    return {
        'status': status,
        'days_remaining': days_remaining,
        'restriction_level': restriction_level,
        'expires_at': expires_at,
        'trial_days_remaining': trial_days_remaining,
        'services_used': services_used,
        'max_trial_services': MAX_TRIAL_SERVICES
    }


def get_super_admin_stats():
    """Get summary statistics for super admin dashboard"""
    conn = get_connection()
    cursor = conn.cursor()

    # Total clinics (excluding super admin clinic id=1)
    cursor.execute('SELECT COUNT(*) as total FROM clinics WHERE id > 1')
    total = cursor.fetchone()['total']

    # Active subscriptions
    cursor.execute('''
        SELECT COUNT(*) as active FROM clinics
        WHERE id > 1 AND subscription_status = 'active' AND is_active = 1
    ''')
    active = cursor.fetchone()['active']

    # Trial
    cursor.execute('''
        SELECT COUNT(*) as trial FROM clinics
        WHERE id > 1 AND subscription_status = 'trial'
    ''')
    trial = cursor.fetchone()['trial']

    # Expired/Grace period
    cursor.execute('''
        SELECT COUNT(*) as expired FROM clinics
        WHERE id > 1 AND subscription_status IN ('expired', 'grace_period')
    ''')
    expired = cursor.fetchone()['expired']

    # Recent payments (last 30 days)
    cursor.execute('''
        SELECT COALESCE(SUM(amount), 0) as revenue
        FROM subscription_payments
        WHERE payment_date >= date('now', '-30 days')
    ''')
    revenue = cursor.fetchone()['revenue']

    conn.close()
    return {
        'total_clinics': total,
        'active_subscriptions': active,
        'trial_clinics': trial,
        'expired_clinics': expired,
        'monthly_revenue': revenue
    }


# ============== Email Verification & Password Reset ==============

def _hash_token(token):
    """Hash a token for secure storage"""
    return hashlib.sha256(token.encode()).hexdigest()


def get_user_by_email(email):
    """Get user by email address"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT u.*, c.name as clinic_name, c.slug as clinic_slug
        FROM users u
        LEFT JOIN clinics c ON u.clinic_id = c.id
        WHERE u.email = ? AND u.is_active = 1
    ''', (email,))
    row = cursor.fetchone()
    conn.close()
    return dict_from_row(row)


def get_user_by_id(user_id):
    """Get user by ID"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT u.*, c.name as clinic_name, c.slug as clinic_slug
        FROM users u
        LEFT JOIN clinics c ON u.clinic_id = c.id
        WHERE u.id = ?
    ''', (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict_from_row(row)


def create_email_verification_token(user_id, expiry_hours=24):
    """Create email verification token for a user"""
    conn = get_connection()
    cursor = conn.cursor()

    # Invalidate any existing tokens for this user
    cursor.execute('DELETE FROM email_verification_tokens WHERE user_id = ?', (user_id,))

    # Generate new token
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    expires_at = datetime.now() + timedelta(hours=expiry_hours)

    cursor.execute('''
        INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
    ''', (user_id, token_hash, expires_at.strftime('%Y-%m-%d %H:%M:%S')))

    conn.commit()
    conn.close()

    return token  # Return unhashed token for email


def verify_email_token(token):
    """Verify email verification token and mark user as verified"""
    token_hash = _hash_token(token)

    conn = get_connection()
    cursor = conn.cursor()

    # Find valid token
    cursor.execute('''
        SELECT * FROM email_verification_tokens
        WHERE token_hash = ? AND used = 0 AND expires_at > datetime('now')
    ''', (token_hash,))
    token_row = cursor.fetchone()

    if not token_row:
        conn.close()
        return False, "Invalid or expired verification token"

    user_id = token_row['user_id']

    # Mark token as used
    cursor.execute('UPDATE email_verification_tokens SET used = 1 WHERE id = ?', (token_row['id'],))

    # Mark user as email verified
    cursor.execute('UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (user_id,))

    conn.commit()
    conn.close()

    return True, "Email verified successfully"


def is_email_verified(user_id):
    """Check if user's email is verified"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT email_verified FROM users WHERE id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row and row['email_verified'] == 1


def create_password_reset_token(user_id, expiry_hours=1):
    """Create password reset token for a user"""
    conn = get_connection()
    cursor = conn.cursor()

    # Invalidate any existing tokens for this user
    cursor.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', (user_id,))

    # Generate new token
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    expires_at = datetime.now() + timedelta(hours=expiry_hours)

    cursor.execute('''
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
    ''', (user_id, token_hash, expires_at.strftime('%Y-%m-%d %H:%M:%S')))

    conn.commit()
    conn.close()

    return token  # Return unhashed token for email


def verify_password_reset_token(token):
    """Verify password reset token and return user_id if valid"""
    token_hash = _hash_token(token)

    conn = get_connection()
    cursor = conn.cursor()

    # Find valid token
    cursor.execute('''
        SELECT * FROM password_reset_tokens
        WHERE token_hash = ? AND used = 0 AND expires_at > datetime('now')
    ''', (token_hash,))
    token_row = cursor.fetchone()

    conn.close()

    if not token_row:
        return None, "Invalid or expired reset token"

    return token_row['user_id'], "Token valid"


def reset_password_with_token(token, new_password):
    """Reset user password using token"""
    token_hash = _hash_token(token)

    conn = get_connection()
    cursor = conn.cursor()

    # Find valid token
    cursor.execute('''
        SELECT * FROM password_reset_tokens
        WHERE token_hash = ? AND used = 0 AND expires_at > datetime('now')
    ''', (token_hash,))
    token_row = cursor.fetchone()

    if not token_row:
        conn.close()
        return False, "Invalid or expired reset token"

    user_id = token_row['user_id']

    # Mark token as used
    cursor.execute('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', (token_row['id'],))

    # Update password
    password_hash = hash_password(new_password)
    cursor.execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                   (password_hash, user_id))

    conn.commit()
    conn.close()

    return True, user_id


def create_user_unverified(clinic_id, username, password, first_name, last_name, email, role='staff'):
    """Create a new user with email_verified = 0"""
    conn = get_connection()
    cursor = conn.cursor()

    password_hash = hash_password(password)
    cursor.execute('''
        INSERT INTO users (clinic_id, username, password_hash, first_name, last_name, email, role, email_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    ''', (clinic_id, username, password_hash, first_name, last_name, email, role))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id


def resend_verification_email(user_id):
    """Check if user can resend verification email (rate limiting)"""
    conn = get_connection()
    cursor = conn.cursor()

    # Check for recent token (within last 2 minutes)
    cursor.execute('''
        SELECT created_at FROM email_verification_tokens
        WHERE user_id = ? AND created_at > datetime('now', '-2 minutes')
        ORDER BY created_at DESC LIMIT 1
    ''', (user_id,))
    recent = cursor.fetchone()
    conn.close()

    if recent:
        return False, "Please wait before requesting another verification email"

    return True, "Can resend"
