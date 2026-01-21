# 📚 Examples Guide - Dental Pricing Calculator

This guide shows you the examples and helpful hints included throughout the application to help you understand dental clinic pricing.

---

## 🎯 Dashboard

### Quick Start Guide
The dashboard explains the 3-step process:
1. **Configure Settings** - Add rent, utilities, salaries, equipment, and capacity
2. **Add Consumables** - Create a library of materials (gloves, anesthetics, gauze)
3. **Create Services** - Define procedures with materials and get automatic pricing

### Cost-Plus Pricing Explanation
The dashboard explains how the system ensures all costs are covered plus your profit margin.

---

## ⚙️ Settings Page

### Info Card: "How Cost-Plus Pricing Works"
Explains the 4-step calculation:
1. **Fixed Costs** spread across chair hours
2. **Service Cost** = Chair time + Doctor fees + Equipment + Materials
3. **Add Profit** margin you set
4. **Add VAT** and round the final price

### Global Settings Examples
- **Currency**: EGP, USD, EUR options explained
- **VAT %**: Example: "14% in Egypt"
- **Default Profit %**: Suggested range: 30-50%
- **Rounding**: Example: "345 → 350"

### Clinic Capacity Examples
- **Number of Chairs**: Example: 3 chairs
- **Working Days**: Example: 24 days (6 days/week)
- **Hours per Day**: Example: 8 hours
- **Utilization %**: Typical range: 70-85%

### Fixed Costs Examples
- **Category**: Rent, Electricity, Internet, Insurance, Cleaning
- **Monthly Amount**: Varies by category
- **Include**: Option to track without including in pricing
- **Sample Data**: Rent (20,000), Utilities (2,500), Admin (3,000)

### Salaries Examples
- **Role/Name**: Receptionist, Dental Assistant, Nurse, Cleaner
- **Monthly Salary**: Including benefits
- **Sample Data**: Receptionist (8,000), Assistant (12,000), Cleaner (4,000)

### Equipment Examples
- **Equipment Name**: X-Ray Machine, Dental Chair, Sterilizer, Compressor, Laser
- **Purchase Cost**: Total cost when purchased
- **Expected Life**: Years until replacement (typically 10)
- **Allocation Method**:
  - **Fixed**: Dental chairs, general tools (spread across all services)
  - **Per-Hour**: X-Ray, specialized machines (charged only when used)
- **Sample Data**:
  - Dental Chair: 100,000 (Fixed, 10 years)
  - CBCT Machine: 800,000 (Fixed, 8 years)
  - Intraoral Scanner: 250,000 (Per-hour, 30 hours/month)

---

## 📦 Consumables Page

### Info Card: "About Consumables"
Explains:
- What consumables are (materials used in procedures)
- Examples: Gloves, Gauze, Anesthetics, Sutures
- How packaging works: Pack → Cases → Units
- How costs are calculated per case

### Consumables Form Examples
- **Item Name**: Latex Gloves, Anesthetic Cartridge, Gauze, Sutures
- **Pack Cost**: Price you pay supplier for one pack (Example: 150)
- **Cases per Pack**: How many boxes/cases (Example: 10)
- **Units per Case**: Individual units per case (Example: 100 gloves per box)

### Sample Consumables Included
1. **Latex Gloves**: Pack of 10 boxes, 100 gloves per box
2. **Anesthetic Cartridges**: 50 cartridges per pack
3. **Dental Composite Material**: 20 syringes per pack
4. **Bonding Agent**: 50 applications per bottle
5. **Etching Gel**: 30 syringes per pack
6. **Cotton Rolls**: 200 rolls per pack
7. **Gauze Sponges**: 100 sponges per pack
8. **Suture Kit**: 12 kits per pack
9. **Dental Burs**: 10 burs per pack
10. **Temporary Filling**: 30 applications per pack
11. **Dental Floss**: 50 spools per pack
12. **Disposable Bibs**: 500 bibs per pack

---

## 🦷 Services Page

### Info Card: "About Services"
Explains what to configure:
- **Chair Time**: How long patient occupies chair (affects fixed costs)
- **Doctor Fee**: Dentist's compensation
- **Equipment**: Per-hour equipment used (X-Ray, etc.)
- **Consumables**: Materials consumed during procedure

### Services Form Examples
- **Service Name**: Tooth Extraction, Root Canal, Cleaning, Filling, Crown, Implant, Whitening
- **Chair Time**: Examples: 0.5, 1, 1.5, 2 hours
- **Doctor Fee/Hour**: Dentist's hourly rate (Example: 500)
- **Custom Profit**: Override global profit for specific services
- **Equipment**: Select per-hour equipment (Example: X-Ray for 0.1 hours)
- **Consumables**: Add materials with quantities (Example: 2x Gloves, 1x Anesthetic)

### Sample Services Included
1. **Dental Checkup & Cleaning** (0.75 hrs, 400/hr)
   - Materials: Gloves, Cotton Rolls, Gauze, Floss, Bib
2. **Composite Filling - Small** (0.5 hrs, 600/hr)
   - Materials: Gloves, Anesthetic, Composite, Bonding, Etching, Cotton, Gauze, Burs, Bib
3. **Composite Filling - Large** (1.0 hrs, 600/hr)
   - More materials than small filling
4. **Root Canal - Single Root** (1.5 hrs, 800/hr)
5. **Root Canal - Multi Root** (2.5 hrs, 800/hr)
6. **Simple Extraction** (0.5 hrs, 500/hr)
7. **Surgical Extraction** (1.0 hrs, 700/hr)
8. **Crown Preparation** (1.5 hrs, 700/hr)
9. **Teeth Whitening** (1.0 hrs, 500/hr)
10. **Deep Cleaning** (1.5 hrs, 500/hr)

---

## 💰 Price List Page

### Info Card: "Price List Overview"
Explains that each price includes:
- Fixed costs (rent, salaries)
- Service costs (chair time, doctor fee, equipment)
- Materials (consumables)
- Profit margin
- VAT

Shows you can print for clinic display or staff reference.

---

## 🧮 How Prices Are Calculated

### Example: Composite Filling - Small

**Fixed Costs (Monthly):**
- Rent: 20,000
- Utilities: 2,500
- Salaries: 36,000 (4 staff)
- Fixed Equipment Depreciation: ~2,000
- **Total Fixed: 60,500/month**

**Clinic Capacity:**
- 1 Chair × 24 Days × 8 Hours × 80% = 153.6 effective hours/month
- **Chair Hourly Rate: 60,500 ÷ 153.6 = 394/hour**

**Service Cost:**
- Chair Time (0.5 hrs): 394 × 0.5 = **197**
- Doctor Fee (0.5 hrs): 600 × 0.5 = **300**
- Consumables: Gloves + Anesthetic + Composite + Bonding + Etching + Cotton + Gauze + Burs + Bib = **~50**
- Equipment: None (not using per-hour equipment)
- **Total Cost: 547**

**Pricing:**
- Profit (40%): 547 × 0.40 = **219**
- Price Before VAT: 547 + 219 = **766**
- VAT (0%): **0**
- Final Price: **766**
- Rounded (to nearest 5): **765**

---

## 📝 Tips for Using the App

### 1. Start with Settings
Configure all your fixed costs, salaries, and capacity first. This creates the foundation for accurate pricing.

### 2. Build Your Consumables Library
Add all materials you use regularly. You can always add more later as you create services.

### 3. Be Realistic with Chair Time
Include patient prep, procedure time, and cleanup. Don't just count active treatment time.

### 4. Review Equipment Allocation
- Use "Fixed" for equipment everyone uses (chairs, basic tools)
- Use "Per-Hour" for specialized equipment used only for specific services

### 5. Check Your Profit Margins
The default 40% works for many clinics, but you can adjust per service for competitive pricing.

### 6. Update Costs Regularly
Material costs change. Update your consumables prices quarterly to maintain accurate pricing.

### 7. Test Different Scenarios
Try changing utilization percentage or profit margins to see how they affect your final prices.

---

## 🎓 Understanding Your Numbers

### Utilization Rate
- **70-80%** is typical for most dental clinics
- **85-90%** is excellent but hard to maintain
- **Below 70%** means you might be over-staffed or under-booked

### Profit Margins
- **30-40%** is standard for general dentistry
- **50-60%** is common for cosmetic procedures
- **20-30%** might be used for community services

### Chair Hourly Rate
If your calculated chair hourly rate seems:
- **Too high**: Review fixed costs or increase capacity/utilization
- **Too low**: You might be undercharging or have very low overhead

---

## 💡 Remember

This tool ensures you:
1. **Cover all costs** - Nothing is left out
2. **Make profit** - Your time and expertise are valued
3. **Stay competitive** - Transparent calculations help you adjust
4. **Grow sustainably** - Pricing supports business health

---

**Questions or Issues?**
Review the tooltips and examples in each section of the app. Every form field has helpful guidance!
