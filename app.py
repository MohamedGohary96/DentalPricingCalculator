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
    get_all_services, get_service_by_id, create_service, update_service, delete_service,
    update_service_consumables,
    calculate_service_price, calculate_all_services
)

# Initialize Flask app
app = Flask(__name__)

# Load configuration
env = os.environ.get('FLASK_ENV', 'production')
app.config.from_object(config[env])

# Ensure required folders exist
os.makedirs(app.config['USER_DATA_DIR'], exist_ok=True)
os.makedirs(os.path.join(app.config['USER_DATA_DIR'], 'data'), exist_ok=True)
os.makedirs(os.path.join(app.config['USER_DATA_DIR'], 'backups'), exist_ok=True)

# Initialize database
init_database()
create_initial_admin()

# Create sample data if environment variable is set
if os.environ.get('CREATE_SAMPLE_DATA', 'False') == 'True':
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
        session.permanent = True
        return jsonify({'success': True, 'user': {
            'id': user['id'],
            'username': user['username'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'role': user.get('role', 'staff'),
            'clinic_name': user.get('clinic_name', '')
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
    return jsonify({
        'id': session.get('user_id'),
        'username': session.get('username'),
        'name': session.get('user_name'),
        'clinic_id': session.get('clinic_id'),
        'clinic_name': session.get('clinic_name'),
        'role': session.get('role')
    })


# ============== Dashboard ==============

@app.route('/api/dashboard/stats')
@login_required
def api_dashboard_stats():
    """Get dashboard statistics"""
    clinic_id = get_clinic_id()
    services = get_all_services(clinic_id)
    fixed_costs = get_all_fixed_costs(clinic_id)
    capacity = get_clinic_capacity(clinic_id)

    total_fixed = sum(c['monthly_amount'] for c in fixed_costs if c['included'])

    theoretical_hours = capacity['chairs'] * capacity['days_per_month'] * capacity['hours_per_day']
    effective_hours = theoretical_hours * (capacity['utilization_percent'] / 100)

    chair_hourly_rate = total_fixed / effective_hours if effective_hours > 0 else 0

    return jsonify({
        'total_services': len(services),
        'total_fixed_monthly': round(total_fixed, 2),
        'chair_hourly_rate': round(chair_hourly_rate, 2),
        'effective_hours': round(effective_hours, 2)
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

    service_id = create_service(clinic_id, **data)

    if consumables:
        update_service_consumables(service_id, consumables)

    return jsonify({'success': True, 'id': service_id})


@app.route('/api/services/<int:service_id>', methods=['PUT'])
@login_required
def api_update_service(service_id):
    """Update service"""
    clinic_id = get_clinic_id()
    data = request.get_json()
    consumables = data.pop('consumables', None)

    update_service(service_id, clinic_id, **data)

    if consumables is not None:
        update_service_consumables(service_id, consumables)

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
    required_fields = ['clinic_name', 'clinic_email', 'owner_username', 'owner_password',
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
    conn.close()

    try:
        result = register_clinic_with_owner(
            clinic_name=data['clinic_name'],
            clinic_email=data['clinic_email'],
            clinic_phone=data.get('clinic_phone'),
            clinic_address=data.get('clinic_address'),
            clinic_city=data.get('clinic_city'),
            owner_username=data['owner_username'],
            owner_password=data['owner_password'],
            owner_first_name=data['owner_first_name'],
            owner_last_name=data['owner_last_name'],
            owner_email=data['owner_email']
        )
        return jsonify({
            'success': True,
            'clinic': result['clinic'],
            'message': 'Clinic registered successfully! You can now login.'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
