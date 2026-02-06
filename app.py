"""
Dental Pricing Calculator - Flask Application
A multi-tenant SaaS platform for dental clinics to calculate service prices using Cost-Plus pricing model
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import configuration
from config import config

# Import database and models
from modules.database import init_database, create_initial_admin, create_sample_data
from modules.models import (
    # Clinic management
    create_clinic, get_clinic_by_id, get_clinic_by_slug, update_clinic,
    # Authentication
    authenticate_user, create_user, get_clinic_users, update_user, register_clinic_with_owner,
    # Settings
    get_global_settings, update_global_settings,
    get_all_fixed_costs, create_fixed_cost, update_fixed_cost, delete_fixed_cost,
    get_all_salaries, create_salary, update_salary, delete_salary,
    get_all_equipment, create_equipment, update_equipment, delete_equipment,
    get_clinic_capacity, update_clinic_capacity,
    get_all_consumables, create_consumable, update_consumable, delete_consumable,
    get_all_materials, create_material, update_material, delete_material,
    # Categories
    get_all_categories, get_category_by_id, create_category, update_category, delete_category,
    # Services
    get_all_services, get_service_by_id, create_service, update_service, delete_service,
    update_service_consumables, update_service_materials, update_service_equipment,
    calculate_service_price, calculate_all_services,
    # Super Admin & Subscription
    is_super_admin, get_all_clinics_admin, get_clinic_payments, record_payment,
    update_clinic_subscription, toggle_clinic_status, get_subscription_status, get_super_admin_stats,
    # Language
    update_clinic_language, get_clinic_language,
    # Email verification & Password reset
    get_user_by_email, get_user_by_id, create_email_verification_token, verify_email_token,
    is_email_verified, create_password_reset_token, verify_password_reset_token,
    reset_password_with_token, create_user_unverified, resend_verification_email
)

# Import email service
from modules.email_service import init_mail, send_verification_email, send_password_reset_email, send_password_changed_notification

# Initialize Flask app
app = Flask(__name__)

# Load configuration
env = os.environ.get('FLASK_ENV', 'production')
app.config.from_object(config[env])

# Initialize Flask-Mail
init_mail(app)

# Ensure required folders exist
os.makedirs(app.config['USER_DATA_DIR'], exist_ok=True)
os.makedirs(os.path.join(app.config['USER_DATA_DIR'], 'data'), exist_ok=True)
os.makedirs(os.path.join(app.config['USER_DATA_DIR'], 'backups'), exist_ok=True)

# Initialize database (safe for production - uses CREATE TABLE IF NOT EXISTS)
init_database()
create_initial_admin()  # Only creates admin if no clinics exist

# Create sample data ONLY in development mode AND if explicitly requested
# NEVER runs in production to protect real data
is_production = os.environ.get('FLASK_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production'
if not is_production and os.environ.get('CREATE_SAMPLE_DATA', 'False') == 'True':
    create_sample_data()


# ============== Authentication Decorators ==============

def login_required(f):
    """Decorator to require login and inject clinic_id"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        if 'clinic_id' not in session:
            return jsonify({'error': 'No clinic associated with user'}), 401
        return f(*args, **kwargs)
    return decorated_function


def get_clinic_id():
    """Get current user's clinic_id from session"""
    return session.get('clinic_id')


def owner_required(f):
    """Decorator to require owner role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        if session.get('role') not in ['owner', 'admin']:
            return jsonify({'error': 'Owner access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


def super_admin_required(f):
    """Decorator to require super admin access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        if not session.get('is_super_admin'):
            return jsonify({'error': 'Super admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


# ============== Routes ==============

@app.route('/')
def index():
    """Main application page"""
    if 'user_id' not in session:
        return render_template('login.html')
    return render_template('index.html')


@app.route('/login', methods=['POST'])
def login():
    """Handle login"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = authenticate_user(username, password)
    if user:
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['user_name'] = f"{user['first_name']} {user['last_name']}"
        session['clinic_id'] = user['clinic_id']
        session['clinic_name'] = user.get('clinic_name', '')
        session['role'] = user.get('role', 'staff')
        # Super admin is the user with username 'admin'
        session['is_super_admin'] = user['username'] == 'admin'
        session.permanent = True

        # Get subscription status for frontend
        subscription = get_subscription_status(user['clinic_id'])

        return jsonify({'success': True, 'user': {
            'id': user['id'],
            'username': user['username'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'role': user.get('role', 'staff'),
            'clinic_name': user.get('clinic_name', ''),
            'is_super_admin': user['username'] == 'admin',
            'subscription': subscription
        }})

    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/logout')
def logout():
    """Handle logout"""
    session.clear()
    return redirect(url_for('index'))


@app.route('/api/user')
@login_required
def get_current_user():
    """Get current logged-in user info"""
    clinic_id = session.get('clinic_id')
    subscription = get_subscription_status(clinic_id) if clinic_id else None
    language = get_clinic_language(clinic_id) if clinic_id else 'en'
    return jsonify({
        'id': session.get('user_id'),
        'username': session.get('username'),
        'name': session.get('user_name'),
        'clinic_id': clinic_id,
        'clinic_name': session.get('clinic_name'),
        'role': session.get('role'),
        'is_super_admin': session.get('is_super_admin', False),
        'subscription': subscription,
        'language': language
    })


# ============== Dashboard ==============

@app.route('/api/dashboard/stats')
@login_required
def api_dashboard_stats():
    """Get dashboard statistics"""
    clinic_id = get_clinic_id()
    services = get_all_services(clinic_id)
    fixed_costs = get_all_fixed_costs(clinic_id)
    salaries = get_all_salaries(clinic_id)
    equipment_list = get_all_equipment(clinic_id)
    capacity = get_clinic_capacity(clinic_id)

    # Fixed costs breakdown (matching service price calculation)
    total_fixed = sum(c['monthly_amount'] for c in fixed_costs if c['included'])
    total_salaries = sum(s['monthly_salary'] for s in salaries if s['included'])

    # Fixed equipment depreciation
    fixed_depreciation = 0
    for eq in equipment_list:
        if eq['allocation_type'] == 'fixed':
            monthly_depreciation = eq['purchase_cost'] / (eq['life_years'] * 12)
            fixed_depreciation += monthly_depreciation

    total_monthly_fixed = total_fixed + total_salaries + fixed_depreciation

    theoretical_hours = capacity['chairs'] * capacity['days_per_month'] * capacity['hours_per_day']
    effective_hours = theoretical_hours * (capacity['utilization_percent'] / 100)

    chair_hourly_rate = total_monthly_fixed / effective_hours if effective_hours > 0 else 0

    return jsonify({
        'total_services': len(services),
        'total_fixed_monthly': round(total_monthly_fixed, 2),
        'chair_hourly_rate': round(chair_hourly_rate, 2),
        'effective_hours': round(effective_hours, 2),
        # Breakdown components
        'fixed_costs': round(total_fixed, 2),
        'staff_salaries': round(total_salaries, 2),
        'equipment_depreciation': round(fixed_depreciation, 2)
    })


# ============== Global Settings ==============

@app.route('/api/settings/global')
@login_required
def api_get_global_settings():
    """Get global settings"""
    clinic_id = get_clinic_id()
    return jsonify(get_global_settings(clinic_id))


@app.route('/api/settings/global', methods=['PUT'])
@login_required
def api_update_global_settings():
    """Update global settings"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    update_global_settings(clinic_id, **data)
    return jsonify({'success': True})


# ============== Language Settings ==============

@app.route('/api/settings/language')
@login_required
def api_get_language():
    """Get clinic language preference"""
    clinic_id = get_clinic_id()
    language = get_clinic_language(clinic_id)
    return jsonify({'language': language})


@app.route('/api/settings/language', methods=['PUT'])
@login_required
def api_update_language():
    """Update clinic language preference"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    language = data.get('language', 'en')
    if language not in ['en', 'ar']:
        return jsonify({'error': 'Invalid language. Supported: en, ar'}), 400
    update_clinic_language(clinic_id, language)
    return jsonify({'success': True})


# ============== Fixed Costs ==============

@app.route('/api/fixed-costs')
@login_required
def api_get_fixed_costs():
    """Get all fixed costs"""
    clinic_id = get_clinic_id()
    return jsonify(get_all_fixed_costs(clinic_id))


@app.route('/api/fixed-costs', methods=['POST'])
@login_required
def api_create_fixed_cost():
    """Create new fixed cost"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    cost_id = create_fixed_cost(clinic_id, **data)
    return jsonify({'success': True, 'id': cost_id})


@app.route('/api/fixed-costs/<int:cost_id>', methods=['PUT'])
@login_required
def api_update_fixed_cost(cost_id):
    """Update fixed cost"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    update_fixed_cost(cost_id, clinic_id, **data)
    return jsonify({'success': True})


@app.route('/api/fixed-costs/<int:cost_id>', methods=['DELETE'])
@login_required
def api_delete_fixed_cost(cost_id):
    """Delete fixed cost"""
    clinic_id = get_clinic_id()
    delete_fixed_cost(cost_id, clinic_id)
    return jsonify({'success': True})


# ============== Salaries ==============

@app.route('/api/salaries')
@login_required
def api_get_salaries():
    """Get all salaries"""
    clinic_id = get_clinic_id()
    return jsonify(get_all_salaries(clinic_id))


@app.route('/api/salaries', methods=['POST'])
@login_required
def api_create_salary():
    """Create new salary"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    salary_id = create_salary(clinic_id, **data)
    return jsonify({'success': True, 'id': salary_id})


@app.route('/api/salaries/<int:salary_id>', methods=['PUT'])
@login_required
def api_update_salary(salary_id):
    """Update salary"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    update_salary(salary_id, clinic_id, **data)
    return jsonify({'success': True})


@app.route('/api/salaries/<int:salary_id>', methods=['DELETE'])
@login_required
def api_delete_salary(salary_id):
    """Delete salary"""
    clinic_id = get_clinic_id()
    delete_salary(salary_id, clinic_id)
    return jsonify({'success': True})


# ============== Equipment ==============

@app.route('/api/equipment')
@login_required
def api_get_equipment():
    """Get all equipment"""
    clinic_id = get_clinic_id()
    return jsonify(get_all_equipment(clinic_id))


@app.route('/api/equipment', methods=['POST'])
@login_required
def api_create_equipment():
    """Create new equipment"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    equipment_id = create_equipment(clinic_id, **data)
    return jsonify({'success': True, 'id': equipment_id})


@app.route('/api/equipment/<int:equipment_id>', methods=['PUT'])
@login_required
def api_update_equipment(equipment_id):
    """Update equipment"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    update_equipment(equipment_id, clinic_id, **data)
    return jsonify({'success': True})


@app.route('/api/equipment/<int:equipment_id>', methods=['DELETE'])
@login_required
def api_delete_equipment(equipment_id):
    """Delete equipment"""
    clinic_id = get_clinic_id()
    delete_equipment(equipment_id, clinic_id)
    return jsonify({'success': True})


# ============== Clinic Capacity ==============

@app.route('/api/capacity')
@login_required
def api_get_capacity():
    """Get clinic capacity"""
    clinic_id = get_clinic_id()
    return jsonify(get_clinic_capacity(clinic_id))


@app.route('/api/capacity', methods=['PUT'])
@login_required
def api_update_capacity():
    """Update clinic capacity"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    update_clinic_capacity(clinic_id, **data)
    return jsonify({'success': True})


# ============== Consumables ==============

@app.route('/api/consumables')
@login_required
def api_get_consumables():
    """Get all consumables"""
    clinic_id = get_clinic_id()
    return jsonify(get_all_consumables(clinic_id))


@app.route('/api/consumables', methods=['POST'])
@login_required
def api_create_consumable():
    """Create new consumable"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    consumable_id = create_consumable(clinic_id, **data)
    return jsonify({'success': True, 'id': consumable_id})


@app.route('/api/consumables/<int:consumable_id>', methods=['PUT'])
@login_required
def api_update_consumable(consumable_id):
    """Update consumable"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    update_consumable(consumable_id, clinic_id, **data)
    return jsonify({'success': True})


@app.route('/api/consumables/<int:consumable_id>', methods=['DELETE'])
@login_required
def api_delete_consumable(consumable_id):
    """Delete consumable"""
    clinic_id = get_clinic_id()
    delete_consumable(consumable_id, clinic_id)
    return jsonify({'success': True})


# ============== Lab Materials ==============

@app.route('/api/materials')
@login_required
def api_get_materials():
    """Get all lab materials"""
    clinic_id = get_clinic_id()
    return jsonify(get_all_materials(clinic_id))


@app.route('/api/materials', methods=['POST'])
@login_required
def api_create_material():
    """Create new lab material"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    material_id = create_material(clinic_id, **data)
    return jsonify({'success': True, 'id': material_id})


@app.route('/api/materials/<int:material_id>', methods=['PUT'])
@login_required
def api_update_material(material_id):
    """Update lab material"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    update_material(material_id, clinic_id, **data)
    return jsonify({'success': True})


@app.route('/api/materials/<int:material_id>', methods=['DELETE'])
@login_required
def api_delete_material(material_id):
    """Delete lab material"""
    clinic_id = get_clinic_id()
    delete_material(material_id, clinic_id)
    return jsonify({'success': True})


# ============== Service Categories ==============

@app.route('/api/categories')
@login_required
def api_get_categories():
    """Get all service categories"""
    clinic_id = get_clinic_id()
    return jsonify(get_all_categories(clinic_id))


@app.route('/api/categories/<int:category_id>')
@login_required
def api_get_category(category_id):
    """Get category by ID"""
    clinic_id = get_clinic_id()
    category = get_category_by_id(category_id, clinic_id)
    if category:
        return jsonify(category)
    return jsonify({'error': 'Category not found'}), 404


@app.route('/api/categories', methods=['POST'])
@login_required
def api_create_category():
    """Create new category"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    category_id = create_category(clinic_id, data['name'], data.get('display_order'))
    return jsonify({'success': True, 'id': category_id})


@app.route('/api/categories/<int:category_id>', methods=['PUT'])
@login_required
def api_update_category(category_id):
    """Update category"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    update_category(category_id, clinic_id, **data)
    return jsonify({'success': True})


@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
@login_required
def api_delete_category(category_id):
    """Delete category (soft delete)"""
    clinic_id = get_clinic_id()
    delete_category(category_id, clinic_id)
    return jsonify({'success': True})


# ============== Services ==============

@app.route('/api/services')
@login_required
def api_get_services():
    """Get all services"""
    clinic_id = get_clinic_id()
    return jsonify(get_all_services(clinic_id))


@app.route('/api/services/<int:service_id>')
@login_required
def api_get_service(service_id):
    """Get service by ID"""
    clinic_id = get_clinic_id()
    service = get_service_by_id(service_id, clinic_id)
    if service:
        return jsonify(service)
    return jsonify({'error': 'Service not found'}), 404


@app.route('/api/services', methods=['POST'])
@login_required
def api_create_service():
    """Create new service"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    consumables = data.pop('consumables', [])
    materials = data.pop('materials', [])
    equipment_list = data.pop('equipment_list', [])

    service_id = create_service(clinic_id, **data)

    if consumables:
        update_service_consumables(service_id, consumables)

    if materials:
        update_service_materials(service_id, materials)

    if equipment_list:
        update_service_equipment(service_id, equipment_list)

    return jsonify({'success': True, 'id': service_id})


@app.route('/api/services/<int:service_id>', methods=['PUT'])
@login_required
def api_update_service(service_id):
    """Update service"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    consumables = data.pop('consumables', None)
    materials = data.pop('materials', None)
    equipment_list = data.pop('equipment_list', None)

    update_service(service_id, clinic_id, **data)

    if consumables is not None:
        update_service_consumables(service_id, consumables)

    if materials is not None:
        update_service_materials(service_id, materials)

    if equipment_list is not None:
        update_service_equipment(service_id, equipment_list)

    return jsonify({'success': True})


@app.route('/api/services/<int:service_id>', methods=['DELETE'])
@login_required
def api_delete_service(service_id):
    """Delete service"""
    clinic_id = get_clinic_id()
    delete_service(service_id, clinic_id)
    return jsonify({'success': True})


# ============== Price Calculations ==============

@app.route('/api/services/<int:service_id>/price')
@login_required
def api_calculate_service_price(service_id):
    """Calculate price for a service"""
    clinic_id = get_clinic_id()
    price_data = calculate_service_price(service_id, clinic_id)
    if price_data:
        return jsonify(price_data)
    return jsonify({'error': 'Service not found'}), 404


@app.route('/api/price-list')
@login_required
def api_get_price_list():
    """Get complete price list for all services"""
    clinic_id = get_clinic_id()
    return jsonify(calculate_all_services(clinic_id))


# ============== Subscription Status ==============

@app.route('/api/subscription/status')
@login_required
def api_get_subscription_status():
    """Get current clinic's subscription status"""
    clinic_id = get_clinic_id()
    return jsonify(get_subscription_status(clinic_id))


# ============== Super Admin ==============

@app.route('/api/super-admin/stats')
@super_admin_required
def api_super_admin_stats():
    """Get super admin dashboard statistics"""
    return jsonify(get_super_admin_stats())


@app.route('/api/super-admin/clinics')
@super_admin_required
def api_super_admin_clinics():
    """Get all clinics (super admin only)"""
    clinics = get_all_clinics_admin()
    # Add subscription status to each clinic
    for clinic in clinics:
        clinic['subscription_info'] = get_subscription_status(clinic['id'])
    return jsonify(clinics)


@app.route('/api/super-admin/clinics/<int:clinic_id>')
@super_admin_required
def api_super_admin_clinic(clinic_id):
    """Get clinic details (super admin only)"""
    clinic = get_clinic_by_id(clinic_id)
    if clinic:
        clinic['subscription_info'] = get_subscription_status(clinic_id)
        clinic['payments'] = get_clinic_payments(clinic_id)
        return jsonify(clinic)
    return jsonify({'error': 'Clinic not found'}), 404


@app.route('/api/super-admin/clinics/<int:clinic_id>/toggle-status', methods=['PUT'])
@super_admin_required
def api_super_admin_toggle_clinic(clinic_id):
    """Toggle clinic active status (super admin only)"""
    # Don't allow toggling the super admin clinic (id=1)
    if clinic_id == 1:
        return jsonify({'error': 'Cannot modify super admin clinic'}), 400
    new_status = toggle_clinic_status(clinic_id)
    return jsonify({'success': True, 'is_active': new_status})


@app.route('/api/super-admin/clinics/<int:clinic_id>/subscription', methods=['PUT'])
@super_admin_required
def api_super_admin_update_subscription(clinic_id):
    """Update clinic subscription (super admin only)"""
    if clinic_id == 1:
        return jsonify({'error': 'Cannot modify super admin clinic'}), 400
    data = request.get_json()
    update_clinic_subscription(clinic_id, **data)
    return jsonify({'success': True})


@app.route('/api/super-admin/clinics/<int:clinic_id>/payments', methods=['GET'])
@super_admin_required
def api_super_admin_clinic_payments(clinic_id):
    """Get clinic payment history (super admin only)"""
    return jsonify(get_clinic_payments(clinic_id))


@app.route('/api/super-admin/clinics/<int:clinic_id>/payments', methods=['POST'])
@super_admin_required
def api_super_admin_record_payment(clinic_id):
    """Record payment for clinic (super admin only)"""
    if clinic_id == 1:
        return jsonify({'error': 'Cannot modify super admin clinic'}), 400
    data = request.get_json()
    result = record_payment(
        clinic_id=clinic_id,
        amount=data['amount'],
        payment_date=data['payment_date'],
        payment_method=data['payment_method'],
        months_paid=data['months_paid'],
        recorded_by=session.get('user_id'),
        receipt_number=data.get('receipt_number'),
        payment_notes=data.get('payment_notes'),
        currency=data.get('currency', 'EGP')
    )
    return jsonify({'success': True, **result})


# ============== Clinic Registration ==============

@app.route('/register')
def register_page():
    """Show clinic registration page"""
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('register.html')


@app.route('/api/register', methods=['POST'])
def api_register_clinic():
    """Register a new clinic with owner"""
    data = request.get_json()

    # Validate required fields
    required_fields = ['clinic_name', 'owner_username', 'owner_password',
                       'owner_first_name', 'owner_last_name', 'owner_email']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    # Check if username already exists
    from modules.database import get_connection
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE username = ?', (data['owner_username'],))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Username already exists'}), 400

    # Check if email already exists
    cursor.execute('SELECT id FROM users WHERE email = ?', (data['owner_email'],))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Email already registered'}), 400
    conn.close()

    try:
        result = register_clinic_with_owner(
            clinic_name=data['clinic_name'],
            clinic_email=data.get('clinic_email'),
            clinic_phone=data.get('clinic_phone'),
            clinic_address=data.get('clinic_address'),
            clinic_city=data.get('clinic_city'),
            owner_username=data['owner_username'],
            owner_password=data['owner_password'],
            owner_first_name=data['owner_first_name'],
            owner_last_name=data['owner_last_name'],
            owner_email=data['owner_email']
        )

        # Create email verification token and send email
        user_id = result['user_id']
        token = create_email_verification_token(user_id)
        user_name = f"{data['owner_first_name']} {data['owner_last_name']}"

        # Try to send verification email (don't fail registration if email fails)
        email_sent, email_message = send_verification_email(
            data['owner_email'], user_name, token
        )

        return jsonify({
            'success': True,
            'clinic': result['clinic'],
            'message': 'Clinic registered successfully! Please check your email to verify your account.',
            'email_sent': email_sent
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Email Verification ==============

@app.route('/verify-email')
def verify_email_page():
    """Email verification page"""
    return render_template('verify_email.html')


@app.route('/api/verify-email', methods=['POST'])
def api_verify_email():
    """Verify email with token"""
    data = request.get_json()
    token = data.get('token')

    if not token:
        return jsonify({'error': 'Verification token is required'}), 400

    success, message = verify_email_token(token)
    if success:
        return jsonify({'success': True, 'message': message})
    return jsonify({'error': message}), 400


@app.route('/api/resend-verification', methods=['POST'])
def api_resend_verification():
    """Resend verification email"""
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = get_user_by_email(email)
    if not user:
        # Don't reveal if email exists
        return jsonify({'success': True, 'message': 'If your email is registered, you will receive a verification link.'})

    if is_email_verified(user['id']):
        return jsonify({'error': 'Email is already verified'}), 400

    # Check rate limiting
    can_resend, rate_message = resend_verification_email(user['id'])
    if not can_resend:
        return jsonify({'error': rate_message}), 429

    # Create new token and send email
    token = create_email_verification_token(user['id'])
    user_name = f"{user['first_name']} {user['last_name']}"

    email_sent, email_message = send_verification_email(email, user_name, token)
    if email_sent:
        return jsonify({'success': True, 'message': 'Verification email sent!'})
    return jsonify({'error': 'Failed to send email. Please try again later.'}), 500


# ============== Password Reset ==============

@app.route('/forgot-password')
def forgot_password_page():
    """Forgot password page"""
    return render_template('forgot_password.html')


@app.route('/reset-password')
def reset_password_page():
    """Password reset page"""
    return render_template('reset_password.html')


@app.route('/api/forgot-password', methods=['POST'])
def api_forgot_password():
    """Request password reset email"""
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = get_user_by_email(email)
    if not user:
        # Don't reveal if email exists - always return success message
        return jsonify({
            'success': True,
            'message': 'If your email is registered, you will receive a password reset link.'
        })

    # Create reset token and send email
    token = create_password_reset_token(user['id'])
    user_name = f"{user['first_name']} {user['last_name']}"

    email_sent, email_message = send_password_reset_email(email, user_name, token)
    return jsonify({
        'success': True,
        'message': 'If your email is registered, you will receive a password reset link.'
    })


@app.route('/api/verify-reset-token', methods=['POST'])
def api_verify_reset_token():
    """Verify if reset token is valid"""
    data = request.get_json()
    token = data.get('token')

    if not token:
        return jsonify({'error': 'Token is required'}), 400

    user_id, message = verify_password_reset_token(token)
    if user_id:
        return jsonify({'valid': True})
    return jsonify({'valid': False, 'error': message}), 400


@app.route('/api/reset-password', methods=['POST'])
def api_reset_password():
    """Reset password with token"""
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')

    if not token:
        return jsonify({'error': 'Reset token is required'}), 400
    if not new_password:
        return jsonify({'error': 'New password is required'}), 400
    if len(new_password) < 5:
        return jsonify({'error': 'Password must be at least 5 characters'}), 400

    success, result = reset_password_with_token(token, new_password)
    if success:
        # Get user to send notification
        user = get_user_by_id(result)
        if user:
            send_password_changed_notification(user['email'], f"{user['first_name']} {user['last_name']}")
        return jsonify({'success': True, 'message': 'Password reset successfully! You can now login.'})
    return jsonify({'error': result}), 400


# ============== Clinic Profile Management ==============

@app.route('/api/clinic')
@login_required
def api_get_clinic():
    """Get current clinic info"""
    clinic_id = get_clinic_id()
    clinic = get_clinic_by_id(clinic_id)
    if clinic:
        return jsonify(clinic)
    return jsonify({'error': 'Clinic not found'}), 404


@app.route('/api/clinic', methods=['PUT'])
@login_required
@owner_required
def api_update_clinic():
    """Update clinic info (owner only)"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    update_clinic(clinic_id, **data)
    return jsonify({'success': True})


# ============== User Management ==============

@app.route('/api/clinic/users')
@login_required
@owner_required
def api_get_clinic_users():
    """Get all users for current clinic (owner only)"""
    clinic_id = get_clinic_id()
    return jsonify(get_clinic_users(clinic_id))


@app.route('/api/clinic/users', methods=['POST'])
@login_required
@owner_required
def api_create_clinic_user():
    """Create a new user for current clinic (owner only)"""
    clinic_id = get_clinic_id()
    data = request.get_json()

    # Check clinic user limit
    clinic = get_clinic_by_id(clinic_id)
    current_users = get_clinic_users(clinic_id)
    if len(current_users) >= clinic.get('max_users', 3):
        return jsonify({'error': 'User limit reached for your subscription plan'}), 400

    try:
        user_id = create_user(
            clinic_id=clinic_id,
            username=data['username'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=data.get('email'),
            role=data.get('role', 'staff')
        )
        return jsonify({'success': True, 'id': user_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/clinic/users/<int:user_id>', methods=['PUT'])
@login_required
@owner_required
def api_update_clinic_user(user_id):
    """Update a user in current clinic (owner only)"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    update_user(user_id, clinic_id, **data)
    return jsonify({'success': True})


# ============== SPA Catch-All Route ==============

@app.route('/<path:path>')
def catch_all(path):
    """Catch-all route for SPA - serves index.html for all app routes"""
    # List of valid SPA routes (authenticated)
    spa_routes = [
        'dashboard', 'settings', 'consumables', 'services',
        'price-list', 'subscription', 'super-admin'
    ]

    # Public auth routes (handled by dedicated templates)
    auth_routes = ['verify-email', 'forgot-password', 'reset-password']

    # If it's a valid SPA route, serve index.html
    if path in spa_routes:
        if 'user_id' not in session:
            return render_template('login.html')
        return render_template('index.html')

    # Auth routes are handled by their own route handlers
    if path in auth_routes:
        return redirect(url_for(path.replace('-', '_') + '_page'))

    # Otherwise, return 404
    return jsonify({'error': 'Not found'}), 404


# ============== Error Handlers ==============

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# ============== Run Application ==============

if __name__ == '__main__':
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5002))

    print('\n' + '='*60)
    print('  🦷 Dental Pricing Calculator')
    print('='*60)
    print(f'\n  Running at: http://localhost:{port}')
    print(f'  Network access: http://YOUR-IP:{port}')
    print('\n  Login: admin / 12345')
    print('='*60 + '\n')

    app.run(host=host, port=port, debug=(env == 'development'))
