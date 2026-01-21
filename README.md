# 🦷 Dental Pricing Calculator

A **multi-tenant SaaS platform** for dental clinics to calculate service prices using a **Cost-Plus pricing model**. Multiple clinics can register, manage their own data independently, and calculate service prices with complete data isolation.

## 🏥 Multi-Clinic SaaS Features

- **Clinic Registration** - Each clinic registers with their own account
- **Complete Data Isolation** - Every clinic's data is completely separate
- **User Roles** - Owner, Admin, and Staff roles with different permissions
- **User Management** - Clinic owners can add staff members
- **Subscription Ready** - Built-in support for subscription plans and limits

## 📋 Features

### Core Pricing Formula
```
Final Price = (Total Cost × (1 + Profit %)) × (1 + VAT %)

Where:
  Total Cost = Chair Time Cost + Doctor Fee + Direct Materials + Equipment Cost
  Chair Time Cost = Chair Hourly Rate × Service Duration
  Chair Hourly Rate = Fixed Monthly Costs ÷ Effective Chair Hours per Month
  Effective Hours = Chairs × Days/Month × Hours/Day × Utilization %
```

### Application Sections

#### 1. Dashboard - Overview statistics and quick start guide
#### 2. Global Settings - Currency, VAT, profit margins, rounding
#### 3. Fixed Costs - Rent, utilities, salaries, equipment depreciation
#### 4. Clinic Capacity - Chairs, days, hours, utilization percentage
#### 5. Consumables Library - Materials with automatic cost calculations
#### 6. Services Configuration - Dental procedures with full cost breakdowns
#### 7. Price List - Complete price list with print capability

## 🚀 Installation

### Quick Start

```bash
git clone https://github.com/YOUR-USERNAME/DentalPricingCalculator.git
cd DentalPricingCalculator
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Start the app
python app.py
```

Open browser: http://localhost:5002
Login: **admin** / **12345**

### ✨ Sample Data Included!

The app comes with realistic dental clinic examples:
- **12 Consumables**: Gloves, Anesthetics, Composite Materials, etc.
- **10 Services**: Cleanings, Fillings, Root Canals, Extractions, etc.
- **Configured Relationships**: Services pre-loaded with consumables

To load sample data, ensure `.env` has:
```
CREATE_SAMPLE_DATA=True
```

To start fresh without examples:
```
CREATE_SAMPLE_DATA=False
```

## 📊 Technical Stack

- **Backend**: Flask (Python)
- **Database**: SQLite with WAL mode
- **Frontend**: Vanilla JavaScript + Modern CSS
- **Styling**: Custom CSS framework based on Shaheen Center design

## 🔧 Configuration

Database locations:
- macOS: `~/Library/Application Support/DentalCalculator/`
- Windows: `%LOCALAPPDATA%\DentalCalculator\`
- Development: `./data/`

## 📖 Usage Guide

### Getting Started (3 Easy Steps)

**Step 1: Configure Settings** ⚙️
- Set your currency, VAT rate, and default profit margin
- Add fixed monthly costs (rent, utilities, insurance)
- Enter staff salaries
- Configure equipment with depreciation
- Define clinic capacity (chairs, working days/hours, utilization rate)

**Step 2: Build Consumables Library** 📦
- Add materials used in procedures (gloves, anesthetics, gauze, etc.)
- Define packaging structure (pack → cases → units)
- System automatically calculates per-case costs
- Examples provided: Latex Gloves, Anesthetic Cartridges, Composite Materials

**Step 3: Create Services** 🦷
- Define dental procedures with chair time and doctor fees
- Attach consumables with quantities to each service
- Select per-hour equipment if needed
- View complete cost breakdown and calculated prices
- Examples included: Fillings, Root Canals, Cleanings, Extractions

The system automatically calculates prices ensuring all costs are covered plus your profit margin!

## 💡 Key Features

### Multi-Tenant Platform
- ✅ **Clinic Registration** - Self-service clinic registration
- ✅ **Data Isolation** - Each clinic's data is completely separate
- ✅ **User Management** - Owners can add and manage staff accounts
- ✅ **Role-Based Access** - Owner, Admin, and Staff permission levels

### Pricing Features
- ✅ **Real-time price calculations** - Instant updates as you change costs or services
- ✅ **Equipment depreciation** - Both fixed (spread across all services) and per-hour (charged to specific services)
- ✅ **Consumables tracking** - Add materials to services with automatic cost calculations
- ✅ **Service-level consumables** - Attach specific materials and quantities to each procedure
- ✅ **Flexible profit margins** - Set global default or customize per service
- ✅ **VAT support** - Automatic tax calculations with configurable rates
- ✅ **Smart rounding** - Round final prices to nearest 1, 5, 10, 50, or 100
- ✅ **Print-ready price lists** - Professional output for clinic display
- ✅ **Helpful examples** - Pre-populated with realistic dental clinic data
- ✅ **Guided interface** - Tooltips and explanations throughout the app

## 🛡️ Security

- Password hashing with PBKDF2-SHA256
- Session management with clinic isolation
- SQL injection prevention
- Input validation
- Multi-tenant data isolation (clinic_id on all tables)
- Role-based access control

## 📱 Network Access

Access from tablets/phones on same network:
```
http://YOUR-IP:5002
```

## 📄 License

MIT License

## 👨‍💻 Author

Created with ❤️ for dental professionals

## 🔌 API Endpoints

### Authentication
- `POST /login` - User login
- `GET /logout` - User logout
- `POST /api/register` - Register new clinic with owner

### Clinic Management (Owner only)
- `GET /api/clinic` - Get clinic info
- `PUT /api/clinic` - Update clinic info
- `GET /api/clinic/users` - List clinic users
- `POST /api/clinic/users` - Add new user
- `PUT /api/clinic/users/<id>` - Update user

### Data APIs (All require login)
- `GET/POST /api/fixed-costs` - Fixed costs
- `GET/POST /api/salaries` - Salaries
- `GET/POST /api/equipment` - Equipment
- `GET/PUT /api/capacity` - Clinic capacity
- `GET/POST /api/consumables` - Consumables
- `GET/POST /api/services` - Services
- `GET /api/price-list` - Full price calculations

---

**Version 2.0.0** - Multi-Tenant SaaS Release
