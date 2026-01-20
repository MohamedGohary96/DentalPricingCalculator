# Dental Pricing Calculator - Project Information

## 🎯 Project Overview
A complete web application for dental clinics to calculate service prices using the Cost-Plus pricing model. Built from scratch based on Shaheen Center's design and architecture.

## 📁 Project Structure

```
DentalPricingCalculator/
├── app.py                 # Main Flask application with all API endpoints
├── config.py              # Configuration with platform-specific paths
├── requirements.txt       # Python dependencies
├── .env.example          # Environment configuration template
├── .gitignore            # Git ignore rules
├── README.md             # Comprehensive documentation
├── modules/
│   ├── __init__.py
│   ├── database.py       # Database schema and initialization
│   └── models.py         # Business logic and calculations
├── templates/
│   ├── login.html        # Login page
│   └── index.html        # Main application
├── static/
│   ├── css/
│   │   └── style.css     # Copied from Shaheen Center
│   └── js/
│       └── app.js        # Complete frontend application
├── data/                 # SQLite database storage
├── uploads/              # File uploads (if needed)
└── backups/              # Database backups

```

## 🔑 Key Features Implemented

### 1. Core Pricing Engine
- ✅ Cost-Plus pricing formula
- ✅ Chair hourly rate calculation
- ✅ Equipment depreciation (fixed & per-hour)
- ✅ Consumables cost tracking
- ✅ Profit margin customization
- ✅ VAT and rounding options

### 2. Data Management
- ✅ Fixed monthly costs
- ✅ Staff salaries
- ✅ Equipment depreciation
- ✅ Clinic capacity settings
- ✅ Consumables library
- ✅ Services configuration

### 3. User Interface
- ✅ Dashboard with statistics
- ✅ Settings management
- ✅ Consumables library
- ✅ Services configuration
- ✅ Price list with print capability
- ✅ Real-time price calculations
- ✅ Modal forms for CRUD operations

### 4. Technical Features
- ✅ RESTful API architecture
- ✅ SQLite with WAL mode
- ✅ Platform-specific data storage
- ✅ Password hashing (PBKDF2-SHA256)
- ✅ Session management
- ✅ Input validation
- ✅ Sample data generation

## 🔐 Security

- Password hashing with PBKDF2-SHA256 (100,000 iterations)
- Secure session management
- SQL injection prevention (parameterized queries)
- Input validation on all forms
- CSRF protection via Flask sessions

## 🗄️ Database Schema

### Tables:
1. **users** - Authentication
2. **global_settings** - App configuration
3. **fixed_costs** - Monthly expenses
4. **salaries** - Staff compensation
5. **equipment** - Depreciation tracking
6. **clinic_capacity** - Operational settings
7. **consumables** - Materials library
8. **services** - Dental procedures
9. **service_consumables** - Junction table

## 📊 Calculations

### Chair Hourly Rate
```python
total_fixed = fixed_costs + salaries + fixed_equipment_depreciation
theoretical_hours = chairs × days_per_month × hours_per_day
effective_hours = theoretical_hours × (utilization_percent / 100)
chair_hourly_rate = total_fixed / effective_hours
```

### Service Price
```python
chair_time_cost = chair_hourly_rate × service_chair_hours
doctor_fee = doctor_hourly_rate × service_chair_hours
materials_cost = sum(consumable_costs × quantities)
equipment_cost = hourly_equipment_rate × equipment_hours_used

total_cost = chair_time_cost + doctor_fee + materials_cost + equipment_cost
profit_amount = total_cost × (profit_percent / 100)
price_before_vat = total_cost + profit_amount
vat_amount = price_before_vat × (vat_percent / 100)
final_price = price_before_vat + vat_amount
rounded_price = round(final_price / rounding_nearest) × rounding_nearest
```

## 🚀 Running the Application

### Development Mode
```bash
cd ~/Downloads/DentalPricingCalculator
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Production Mode
- Set `FLASK_ENV=production` in `.env`
- Use platform-specific database storage
- Session cookies with secure settings

## 🌐 Network Access

The application binds to `0.0.0.0:5002` by default, allowing:
- Local access: `http://localhost:5002`
- Network access: `http://YOUR-IP:5002`

Perfect for tablet access in clinic settings.

## 📱 Responsive Design

- Desktop: Full sidebar navigation
- Tablet: Optimized for clinic workflows
- Mobile: Responsive tables and forms
- Print: Clean price list formatting

## 🔄 Data Persistence

### Platform-Specific Storage:
- **macOS**: `~/Library/Application Support/DentalCalculator/`
- **Windows**: `%LOCALAPPDATA%\DentalCalculator\`
- **Development**: `./data/`

Ensures data survives app updates and follows OS conventions.

## 📈 Future Enhancements (Not Implemented)

- Bilingual support (Arabic/English)
- PDF/Excel export
- Backup & restore
- User management
- Audit logs
- Price history tracking
- What-if analysis sliders
- Service templates
- Multi-clinic support

## 🔗 GitHub Repository

**URL**: https://github.com/MohamedGohary96/DentalPricingCalculator

### Repository Contents:
- Complete source code
- Comprehensive README
- .gitignore configured
- MIT License (recommended)
- Sample data for testing

## 👥 Default Credentials

- **Username**: admin
- **Password**: 12345

⚠️ Change password after first login in production!

## 🐛 Known Issues

None currently. This is a fresh v1.0.0 release.

## 📝 Notes

- Based on Shaheen Center design and architecture
- Completely separate codebase
- No patient data management (focused on pricing only)
- Standalone application (no external dependencies)
- Production-ready with security best practices

---

**Created**: January 21, 2026
**Version**: 1.0.0
**Author**: Mohamed Gohary with Claude Sonnet 4.5
**License**: MIT
