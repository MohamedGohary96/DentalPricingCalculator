"""
Dental Pricing Calculator - Flask Application
A modern web application for dental clinics to calculate service prices using Cost-Plus pricing model
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
    authenticate_user,
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
    """Decorator to require login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
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
        session.permanent = True
        return jsonify({'success': True, 'user': user})

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
        'name': session.get('user_name')
    })


# ============== Dashboard ==============

@app.route('/api/dashboard/stats')
@login_required
def api_dashboard_stats():
    """Get dashboard statistics"""
    services = get_all_services()
    fixed_costs = get_all_fixed_costs()
    capacity = get_clinic_capacity()

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
    return jsonify(get_global_settings())


@app.route('/api/settings/global', methods=['PUT'])
@login_required
def api_update_global_settings():
    """Update global settings"""
    data = request.get_json()
    update_global_settings(**data)
    return jsonify({'success': True})


# ============== Fixed Costs ==============

@app.route('/api/fixed-costs')
@login_required
def api_get_fixed_costs():
    """Get all fixed costs"""
    return jsonify(get_all_fixed_costs())


@app.route('/api/fixed-costs', methods=['POST'])
@login_required
def api_create_fixed_cost():
    """Create new fixed cost"""
    data = request.get_json()
    cost_id = create_fixed_cost(**data)
    return jsonify({'success': True, 'id': cost_id})


@app.route('/api/fixed-costs/<int:cost_id>', methods=['PUT'])
@login_required
def api_update_fixed_cost(cost_id):
    """Update fixed cost"""
    data = request.get_json()
    update_fixed_cost(cost_id, **data)
    return jsonify({'success': True})


@app.route('/api/fixed-costs/<int:cost_id>', methods=['DELETE'])
@login_required
def api_delete_fixed_cost(cost_id):
    """Delete fixed cost"""
    delete_fixed_cost(cost_id)
    return jsonify({'success': True})


# ============== Salaries ==============

@app.route('/api/salaries')
@login_required
def api_get_salaries():
    """Get all salaries"""
    return jsonify(get_all_salaries())


@app.route('/api/salaries', methods=['POST'])
@login_required
def api_create_salary():
    """Create new salary"""
    data = request.get_json()
    salary_id = create_salary(**data)
    return jsonify({'success': True, 'id': salary_id})


@app.route('/api/salaries/<int:salary_id>', methods=['PUT'])
@login_required
def api_update_salary(salary_id):
    """Update salary"""
    data = request.get_json()
    update_salary(salary_id, **data)
    return jsonify({'success': True})


@app.route('/api/salaries/<int:salary_id>', methods=['DELETE'])
@login_required
def api_delete_salary(salary_id):
    """Delete salary"""
    delete_salary(salary_id)
    return jsonify({'success': True})


# ============== Equipment ==============

@app.route('/api/equipment')
@login_required
def api_get_equipment():
    """Get all equipment"""
    return jsonify(get_all_equipment())


@app.route('/api/equipment', methods=['POST'])
@login_required
def api_create_equipment():
    """Create new equipment"""
    data = request.get_json()
    equipment_id = create_equipment(**data)
    return jsonify({'success': True, 'id': equipment_id})


@app.route('/api/equipment/<int:equipment_id>', methods=['PUT'])
@login_required
def api_update_equipment(equipment_id):
    """Update equipment"""
    data = request.get_json()
    update_equipment(equipment_id, **data)
    return jsonify({'success': True})


@app.route('/api/equipment/<int:equipment_id>', methods=['DELETE'])
@login_required
def api_delete_equipment(equipment_id):
    """Delete equipment"""
    delete_equipment(equipment_id)
    return jsonify({'success': True})


# ============== Clinic Capacity ==============

@app.route('/api/capacity')
@login_required
def api_get_capacity():
    """Get clinic capacity"""
    return jsonify(get_clinic_capacity())


@app.route('/api/capacity', methods=['PUT'])
@login_required
def api_update_capacity():
    """Update clinic capacity"""
    data = request.get_json()
    update_clinic_capacity(**data)
    return jsonify({'success': True})


# ============== Consumables ==============

@app.route('/api/consumables')
@login_required
def api_get_consumables():
    """Get all consumables"""
    return jsonify(get_all_consumables())


@app.route('/api/consumables', methods=['POST'])
@login_required
def api_create_consumable():
    """Create new consumable"""
    data = request.get_json()
    consumable_id = create_consumable(**data)
    return jsonify({'success': True, 'id': consumable_id})


@app.route('/api/consumables/<int:consumable_id>', methods=['PUT'])
@login_required
def api_update_consumable(consumable_id):
    """Update consumable"""
    data = request.get_json()
    update_consumable(consumable_id, **data)
    return jsonify({'success': True})


@app.route('/api/consumables/<int:consumable_id>', methods=['DELETE'])
@login_required
def api_delete_consumable(consumable_id):
    """Delete consumable"""
    delete_consumable(consumable_id)
    return jsonify({'success': True})


# ============== Services ==============

@app.route('/api/services')
@login_required
def api_get_services():
    """Get all services"""
    return jsonify(get_all_services())


@app.route('/api/services/<int:service_id>')
@login_required
def api_get_service(service_id):
    """Get service by ID"""
    service = get_service_by_id(service_id)
    if service:
        return jsonify(service)
    return jsonify({'error': 'Service not found'}), 404


@app.route('/api/services', methods=['POST'])
@login_required
def api_create_service():
    """Create new service"""
    data = request.get_json()
    consumables = data.pop('consumables', [])

    service_id = create_service(**data)

    if consumables:
        update_service_consumables(service_id, consumables)

    return jsonify({'success': True, 'id': service_id})


@app.route('/api/services/<int:service_id>', methods=['PUT'])
@login_required
def api_update_service(service_id):
    """Update service"""
    data = request.get_json()
    consumables = data.pop('consumables', None)

    update_service(service_id, **data)

    if consumables is not None:
        update_service_consumables(service_id, consumables)

    return jsonify({'success': True})


@app.route('/api/services/<int:service_id>', methods=['DELETE'])
@login_required
def api_delete_service(service_id):
    """Delete service"""
    delete_service(service_id)
    return jsonify({'success': True})


# ============== Price Calculations ==============

@app.route('/api/services/<int:service_id>/price')
@login_required
def api_calculate_service_price(service_id):
    """Calculate price for a service"""
    price_data = calculate_service_price(service_id)
    if price_data:
        return jsonify(price_data)
    return jsonify({'error': 'Service not found'}), 404


@app.route('/api/price-list')
@login_required
def api_get_price_list():
    """Get complete price list for all services"""
    return jsonify(calculate_all_services())


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
