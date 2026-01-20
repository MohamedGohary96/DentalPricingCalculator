# 🦷 Dental Pricing Calculator

A modern web application for dental clinics to calculate service prices using a **Cost-Plus pricing model**. This tool helps clinic owners determine fair prices by accounting for fixed costs, chair time, doctor fees, consumables, equipment depreciation, and desired profit margins.

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
python app.py
```

Open browser: http://localhost:5002
Login: admin / 12345

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

1. Configure global settings (currency, VAT, profit %)
2. Add fixed costs and staff salaries
3. Set clinic capacity (chairs, hours, utilization)
4. Build consumables library
5. Create services with materials and pricing
6. View and print price list

## 💡 Key Features

- Real-time price calculations
- Equipment depreciation (fixed & per-hour)
- Consumables cost tracking
- Profit margin customization per service
- VAT and rounding options
- Print-ready price lists

## 🛡️ Security

- Password hashing with PBKDF2-SHA256
- Session management
- SQL injection prevention
- Input validation

## 📱 Network Access

Access from tablets/phones on same network:
```
http://YOUR-IP:5002
```

## 📄 License

MIT License

## 👨‍💻 Author

Created with ❤️ for dental professionals

---

**Version 1.0.0** - Initial Release
