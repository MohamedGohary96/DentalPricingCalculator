/**
 * Dental Pricing Calculator - Main Application
 */

const API = {
    async get(url) { const r = await fetch(url); if (!r.ok) throw new Error(await r.text()); return r.json(); },
    async post(url, data) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed'); } return r.json(); },
    async put(url, data) { const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed'); } return r.json(); },
    async delete(url) { const r = await fetch(url, { method: 'DELETE' }); if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed'); } return r.json(); }
};

function showToast(msg, type='success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<div class="toast-icon">${type==='success'?'✓':'✕'}</div><div class="toast-message">${msg}</div>`;
    c.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

function formatCurrency(amount, currency = 'EGP') {
    return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
}

function openModal(title, content, size='') {
    const id = 'modal-' + Date.now();
    document.getElementById('modals').insertAdjacentHTML('beforeend',
        `<div class="modal-backdrop active" id="${id}">
            <div class="modal ${size}">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="closeModal('${id}')">&times;</button>
                </div>
                <div class="modal-body">${content}</div>
            </div>
        </div>`);
    return id;
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove('active');
        setTimeout(() => m.remove(), 200);
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => {
        m.classList.remove('active');
        setTimeout(() => m.remove(), 200);
    });
}

const APP = {
    currentPage: 'dashboard',
    user: null,
    settings: null,

    async init() {
        this.user = await API.get('/api/user');
        this.settings = await API.get('/api/settings/global');
        document.getElementById('userName').textContent = this.user.name;
        this.loadPage('dashboard');
    },

    async loadPage(page) {
        this.currentPage = page;
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[onclick="APP.loadPage('${page}')"]`)?.classList.add('active');

        const content = document.getElementById('mainContent');
        content.innerHTML = '<div style="padding:2rem;text-align:center;">Loading...</div>';

        const html = await Pages[page]();
        content.innerHTML = html;
    }
};

const Pages = {
    async dashboard() {
        const stats = await API.get('/api/dashboard/stats');
        const priceList = await API.get('/api/price-list');
        const topServices = priceList.slice(0, 5);

        return `
            <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="stat-card" style="--stat-color:#667eea;--stat-bg:#e0e7ff;">
                    <div class="stat-icon">🦷</div>
                    <div class="stat-content">
                        <div class="stat-label">Total Services</div>
                        <div class="stat-value">${stats.total_services}</div>
                    </div>
                </div>
                <div class="stat-card" style="--stat-color:#f59e0b;--stat-bg:#fef3c7;">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-label">Fixed Monthly Cost</div>
                        <div class="stat-value">${formatCurrency(stats.total_fixed_monthly)}</div>
                    </div>
                </div>
                <div class="stat-card" style="--stat-color:#22c55e;--stat-bg:#dcfce7;">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-content">
                        <div class="stat-label">Chair Hourly Rate</div>
                        <div class="stat-value">${formatCurrency(stats.chair_hourly_rate)}</div>
                    </div>
                </div>
                <div class="stat-card" style="--stat-color:#14b8a6;--stat-bg:#ccfbf1;">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-label">Effective Hours/Month</div>
                        <div class="stat-value">${stats.effective_hours.toFixed(1)}</div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">Quick Start Guide</h3>
                </div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
                        <div style="padding:1.5rem;background:var(--gray-50);border-radius:8px;text-align:center;cursor:pointer;" onclick="APP.loadPage('settings')">
                            <div style="font-size:2rem;margin-bottom:0.5rem;">⚙️</div>
                            <h4>1. Configure Settings</h4>
                            <p style="color:var(--gray-600);font-size:0.875rem;">Set fixed costs, salaries & capacity</p>
                        </div>
                        <div style="padding:1.5rem;background:var(--gray-50);border-radius:8px;text-align:center;cursor:pointer;" onclick="APP.loadPage('consumables')">
                            <div style="font-size:2rem;margin-bottom:0.5rem;">📦</div>
                            <h4>2. Add Consumables</h4>
                            <p style="color:var(--gray-600);font-size:0.875rem;">Build your materials library</p>
                        </div>
                        <div style="padding:1.5rem;background:var(--gray-50);border-radius:8px;text-align:center;cursor:pointer;" onclick="APP.loadPage('services')">
                            <div style="font-size:2rem;margin-bottom:0.5rem;">🦷</div>
                            <h4>3. Create Services</h4>
                            <p style="color:var(--gray-600);font-size:0.875rem;">Configure dental procedures</p>
                        </div>
                    </div>
                </div>
            </div>

            ${topServices.length > 0 ? `
            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">Recent Services</h3>
                    <button class="btn btn-sm btn-primary" onclick="APP.loadPage('price-list')">View All →</button>
                </div>
                <div class="card-body" style="padding:0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Service</th>
                                <th>Cost</th>
                                <th>Final Price</th>
                                <th>Margin</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topServices.map(s => `
                                <tr>
                                    <td><strong>${s.service_name}</strong></td>
                                    <td>${formatCurrency(s.total_cost)}</td>
                                    <td><strong>${formatCurrency(s.rounded_price)}</strong></td>
                                    <td><span class="badge badge-success">${s.profit_percent}%</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}
        `;
    },

    async settings() {
        const settings = await API.get('/api/settings/global');
        const fixedCosts = await API.get('/api/fixed-costs');
        const salaries = await API.get('/api/salaries');
        const equipment = await API.get('/api/equipment');
        const capacity = await API.get('/api/capacity');

        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Global Settings</h3>
                </div>
                <div class="card-body">
                    <form id="globalSettingsForm" class="form-row">
                        <div class="form-group">
                            <label class="form-label">Currency</label>
                            <select class="form-select" name="currency">
                                <option value="EGP" ${settings.currency==='EGP'?'selected':''}>EGP</option>
                                <option value="USD" ${settings.currency==='USD'?'selected':''}>USD</option>
                                <option value="EUR" ${settings.currency==='EUR'?'selected':''}>EUR</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">VAT %</label>
                            <input type="number" class="form-input" name="vat_percent" value="${settings.vat_percent}" step="0.1" min="0" max="100">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Default Profit %</label>
                            <input type="number" class="form-input" name="default_profit_percent" value="${settings.default_profit_percent}" step="1" min="0" max="200">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rounding</label>
                            <select class="form-select" name="rounding_nearest">
                                ${[1,5,10,50,100].map(v => `<option value="${v}" ${settings.rounding_nearest===v?'selected':''}>${v}</option>`).join('')}
                            </select>
                        </div>
                    </form>
                    <div style="margin-top:1rem;">
                        <button class="btn btn-primary" onclick="Pages.saveGlobalSettings()">Save Settings</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">Clinic Capacity</h3>
                </div>
                <div class="card-body">
                    <form id="capacityForm" class="form-row">
                        <div class="form-group">
                            <label class="form-label">Number of Chairs</label>
                            <input type="number" class="form-input" name="chairs" value="${capacity.chairs}" min="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Days per Month</label>
                            <input type="number" class="form-input" name="days_per_month" value="${capacity.days_per_month}" min="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Hours per Day</label>
                            <input type="number" class="form-input" name="hours_per_day" value="${capacity.hours_per_day}" min="1" step="0.5">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Utilization %</label>
                            <input type="number" class="form-input" name="utilization_percent" value="${capacity.utilization_percent}" min="1" max="100">
                        </div>
                    </form>
                    <div style="margin-top:1rem;">
                        <button class="btn btn-primary" onclick="Pages.saveCapacity()">Save Capacity</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">Fixed Monthly Costs</h3>
                    <button class="btn btn-sm btn-primary" onclick="Pages.showFixedCostForm()">+ Add Cost</button>
                </div>
                <div class="card-body" style="padding:0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Monthly Amount</th>
                                <th>Include?</th>
                                <th>Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fixedCosts.map(c => `
                                <tr>
                                    <td>${c.category}</td>
                                    <td>${formatCurrency(c.monthly_amount)}</td>
                                    <td><span class="badge badge-${c.included?'success':'gray'}">${c.included?'✓':'✗'}</span></td>
                                    <td>${c.notes||'-'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.showFixedCostForm(${c.id})" title="Edit">✎</button>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.deleteFixedCost(${c.id})" title="Delete">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">Staff Salaries</h3>
                    <button class="btn btn-sm btn-primary" onclick="Pages.showSalaryForm()">+ Add Salary</button>
                </div>
                <div class="card-body" style="padding:0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Role/Name</th>
                                <th>Monthly Salary</th>
                                <th>Include?</th>
                                <th>Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${salaries.map(s => `
                                <tr>
                                    <td>${s.role_name}</td>
                                    <td>${formatCurrency(s.monthly_salary)}</td>
                                    <td><span class="badge badge-${s.included?'success':'gray'}">${s.included?'✓':'✗'}</span></td>
                                    <td>${s.notes||'-'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.showSalaryForm(${s.id})" title="Edit">✎</button>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.deleteSalary(${s.id})" title="Delete">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">Equipment Depreciation</h3>
                    <button class="btn btn-sm btn-primary" onclick="Pages.showEquipmentForm()">+ Add Equipment</button>
                </div>
                <div class="card-body" style="padding:0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Asset Name</th>
                                <th>Purchase Cost</th>
                                <th>Life (years)</th>
                                <th>Allocation</th>
                                <th>Monthly Usage Hours</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${equipment.map(e => `
                                <tr>
                                    <td>${e.asset_name}</td>
                                    <td>${formatCurrency(e.purchase_cost)}</td>
                                    <td>${e.life_years}</td>
                                    <td><span class="badge badge-${e.allocation_type==='fixed'?'info':'warning'}">${e.allocation_type}</span></td>
                                    <td>${e.monthly_usage_hours||'-'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.showEquipmentForm(${e.id})" title="Edit">✎</button>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.deleteEquipment(${e.id})" title="Delete">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async saveGlobalSettings() {
        const form = document.getElementById('globalSettingsForm');
        const formData = Object.fromEntries(new FormData(form));
        formData.vat_percent = parseFloat(formData.vat_percent);
        formData.default_profit_percent = parseFloat(formData.default_profit_percent);
        formData.rounding_nearest = parseInt(formData.rounding_nearest);

        try {
            await API.put('/api/settings/global', formData);
            showToast('Settings saved');
            APP.settings = await API.get('/api/settings/global');
        } catch(err) {
            showToast(err.message, 'error');
        }
    },

    async saveCapacity() {
        const form = document.getElementById('capacityForm');
        const formData = Object.fromEntries(new FormData(form));
        formData.chairs = parseInt(formData.chairs);
        formData.days_per_month = parseInt(formData.days_per_month);
        formData.hours_per_day = parseFloat(formData.hours_per_day);
        formData.utilization_percent = parseFloat(formData.utilization_percent);

        try {
            await API.put('/api/capacity', formData);
            showToast('Capacity saved');
        } catch(err) {
            showToast(err.message, 'error');
        }
    },

    async showFixedCostForm(id=null) {
        let cost = null;
        if (id) {
            const costs = await API.get('/api/fixed-costs');
            cost = costs.find(c => c.id === id);
        }

        const content = `
            <form id="fixedCostForm">
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <input type="text" class="form-input" name="category" value="${cost?.category||''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Monthly Amount</label>
                    <input type="number" class="form-input" name="monthly_amount" value="${cost?.monthly_amount||''}" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Include in calculations?</label>
                    <select class="form-select" name="included">
                        <option value="1" ${cost?.included?'selected':''}>Yes</option>
                        <option value="0" ${!cost?.included?'selected':''}>No</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <input type="text" class="form-input" name="notes" value="${cost?.notes||''}">
                </div>
                <div class="modal-footer" style="margin:1.5rem -1.5rem -1.5rem;padding:1rem 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        `;

        openModal(id ? 'Edit Fixed Cost' : 'Add Fixed Cost', content);

        document.getElementById('fixedCostForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(e.target));
            formData.monthly_amount = parseFloat(formData.monthly_amount);
            formData.included = parseInt(formData.included);

            try {
                if (id) {
                    await API.put(`/api/fixed-costs/${id}`, formData);
                } else {
                    await API.post('/api/fixed-costs', formData);
                }
                showToast('Fixed cost saved');
                closeAllModals();
                APP.loadPage('settings');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    async deleteFixedCost(id) {
        if (confirm('Delete this fixed cost?')) {
            try {
                await API.delete(`/api/fixed-costs/${id}`);
                showToast('Fixed cost deleted');
                APP.loadPage('settings');
            } catch(err) {
                showToast(err.message, 'error');
            }
        }
    },

    async showSalaryForm(id=null) {
        let salary = null;
        if (id) {
            const salaries = await API.get('/api/salaries');
            salary = salaries.find(s => s.id === id);
        }

        const content = `
            <form id="salaryForm">
                <div class="form-group">
                    <label class="form-label">Role/Name</label>
                    <input type="text" class="form-input" name="role_name" value="${salary?.role_name||''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Monthly Salary</label>
                    <input type="number" class="form-input" name="monthly_salary" value="${salary?.monthly_salary||''}" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Include in calculations?</label>
                    <select class="form-select" name="included">
                        <option value="1" ${salary?.included?'selected':''}>Yes</option>
                        <option value="0" ${!salary?.included?'selected':''}>No</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <input type="text" class="form-input" name="notes" value="${salary?.notes||''}">
                </div>
                <div class="modal-footer" style="margin:1.5rem -1.5rem -1.5rem;padding:1rem 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        `;

        openModal(id ? 'Edit Salary' : 'Add Salary', content);

        document.getElementById('salaryForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(e.target));
            formData.monthly_salary = parseFloat(formData.monthly_salary);
            formData.included = parseInt(formData.included);

            try {
                if (id) {
                    await API.put(`/api/salaries/${id}`, formData);
                } else {
                    await API.post('/api/salaries', formData);
                }
                showToast('Salary saved');
                closeAllModals();
                APP.loadPage('settings');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    async deleteSalary(id) {
        if (confirm('Delete this salary?')) {
            try {
                await API.delete(`/api/salaries/${id}`);
                showToast('Salary deleted');
                APP.loadPage('settings');
            } catch(err) {
                showToast(err.message, 'error');
            }
        }
    },

    async showEquipmentForm(id=null) {
        let equipment = null;
        if (id) {
            const equipmentList = await API.get('/api/equipment');
            equipment = equipmentList.find(e => e.id === id);
        }

        const content = `
            <form id="equipmentForm">
                <div class="form-group">
                    <label class="form-label">Asset Name</label>
                    <input type="text" class="form-input" name="asset_name" value="${equipment?.asset_name||''}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Purchase Cost</label>
                        <input type="number" class="form-input" name="purchase_cost" value="${equipment?.purchase_cost||''}" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Life (years)</label>
                        <input type="number" class="form-input" name="life_years" value="${equipment?.life_years||10}" min="1" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Allocation Type</label>
                        <select class="form-select" name="allocation_type" id="allocationType" onchange="toggleUsageHours()" required>
                            <option value="fixed" ${equipment?.allocation_type==='fixed'?'selected':''}>Fixed</option>
                            <option value="per-hour" ${equipment?.allocation_type==='per-hour'?'selected':''}>Per-Hour</option>
                        </select>
                    </div>
                    <div class="form-group" id="usageHoursGroup" style="display:${equipment?.allocation_type==='per-hour'?'block':'none'}">
                        <label class="form-label">Monthly Usage Hours</label>
                        <input type="number" class="form-input" name="monthly_usage_hours" value="${equipment?.monthly_usage_hours||''}" step="0.1">
                    </div>
                </div>
                <div class="modal-footer" style="margin:1.5rem -1.5rem -1.5rem;padding:1rem 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
            <script>
                function toggleUsageHours() {
                    const type = document.getElementById('allocationType').value;
                    document.getElementById('usageHoursGroup').style.display = type === 'per-hour' ? 'block' : 'none';
                }
            </script>
        `;

        openModal(id ? 'Edit Equipment' : 'Add Equipment', content);

        document.getElementById('equipmentForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(e.target));
            formData.purchase_cost = parseFloat(formData.purchase_cost);
            formData.life_years = parseInt(formData.life_years);
            if (formData.monthly_usage_hours) {
                formData.monthly_usage_hours = parseFloat(formData.monthly_usage_hours);
            }

            try {
                if (id) {
                    await API.put(`/api/equipment/${id}`, formData);
                } else {
                    await API.post('/api/equipment', formData);
                }
                showToast('Equipment saved');
                closeAllModals();
                APP.loadPage('settings');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    async deleteEquipment(id) {
        if (confirm('Delete this equipment?')) {
            try {
                await API.delete(`/api/equipment/${id}`);
                showToast('Equipment deleted');
                APP.loadPage('settings');
            } catch(err) {
                showToast(err.message, 'error');
            }
        }
    },

    async consumables() {
        const consumables = await API.get('/api/consumables');

        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Consumables Library</h3>
                    <button class="btn btn-primary" onclick="Pages.showConsumableForm()">+ Add Consumable</button>
                </div>
                <div class="card-body" style="padding:0;">
                    ${consumables.length > 0 ? `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Pack Cost</th>
                                    <th>Cases per Pack</th>
                                    <th>Units per Case</th>
                                    <th>Per Case Cost</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${consumables.map(c => {
                                    const perCaseCost = (c.pack_cost / c.cases_per_pack) * c.units_per_case;
                                    return `
                                        <tr>
                                            <td><strong>${c.item_name}</strong></td>
                                            <td>${formatCurrency(c.pack_cost)}</td>
                                            <td>${c.cases_per_pack}</td>
                                            <td>${c.units_per_case}</td>
                                            <td><strong>${formatCurrency(perCaseCost)}</strong></td>
                                            <td>
                                                <button class="btn btn-sm btn-ghost" onclick="Pages.showConsumableForm(${c.id})" title="Edit">✎</button>
                                                <button class="btn btn-sm btn-ghost" onclick="Pages.deleteConsumable(${c.id})" title="Delete">🗑️</button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">📦</div>
                            <h3>No Consumables</h3>
                            <p>Start by adding your first consumable item</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    async showConsumableForm(id=null) {
        let consumable = null;
        if (id) {
            const consumables = await API.get('/api/consumables');
            consumable = consumables.find(c => c.id === id);
        }

        const content = `
            <form id="consumableForm">
                <div class="form-group">
                    <label class="form-label">Item Name</label>
                    <input type="text" class="form-input" name="item_name" value="${consumable?.item_name||''}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Pack Cost</label>
                        <input type="number" class="form-input" name="pack_cost" value="${consumable?.pack_cost||''}" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cases per Pack</label>
                        <input type="number" class="form-input" name="cases_per_pack" value="${consumable?.cases_per_pack||1}" min="1" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Units per Case</label>
                        <input type="number" class="form-input" name="units_per_case" value="${consumable?.units_per_case||1}" min="1" required>
                    </div>
                </div>
                <div class="modal-footer" style="margin:1.5rem -1.5rem -1.5rem;padding:1rem 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        `;

        openModal(id ? 'Edit Consumable' : 'Add Consumable', content);

        document.getElementById('consumableForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(e.target));
            formData.pack_cost = parseFloat(formData.pack_cost);
            formData.cases_per_pack = parseInt(formData.cases_per_pack);
            formData.units_per_case = parseInt(formData.units_per_case);

            try {
                if (id) {
                    await API.put(`/api/consumables/${id}`, formData);
                } else {
                    await API.post('/api/consumables', formData);
                }
                showToast('Consumable saved');
                closeAllModals();
                APP.loadPage('consumables');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    async deleteConsumable(id) {
        if (confirm('Delete this consumable?')) {
            try {
                await API.delete(`/api/consumables/${id}`);
                showToast('Consumable deleted');
                APP.loadPage('consumables');
            } catch(err) {
                showToast(err.message, 'error');
            }
        }
    },

    async services() {
        const services = await API.get('/api/services');

        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Services Configuration</h3>
                    <button class="btn btn-primary" onclick="Pages.showServiceForm()">+ Add Service</button>
                </div>
                <div class="card-body" style="padding:0;">
                    ${services.length > 0 ? `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Service Name</th>
                                    <th>Chair Time (hrs)</th>
                                    <th>Doctor Fee/hr</th>
                                    <th>Equipment</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${services.map(s => `
                                    <tr>
                                        <td><strong>${s.name}</strong></td>
                                        <td>${s.chair_time_hours}</td>
                                        <td>${formatCurrency(s.doctor_hourly_fee)}</td>
                                        <td>${s.equipment_name||'-'}</td>
                                        <td>
                                            <button class="btn btn-sm btn-success" onclick="Pages.viewServicePrice(${s.id})" title="View Price">💰</button>
                                            <button class="btn btn-sm btn-ghost" onclick="Pages.showServiceForm(${s.id})" title="Edit">✎</button>
                                            <button class="btn btn-sm btn-ghost" onclick="Pages.deleteService(${s.id})" title="Delete">🗑️</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">🦷</div>
                            <h3>No Services</h3>
                            <p>Start by adding your first dental service</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    async showServiceForm(id=null) {
        const equipment = await API.get('/api/equipment');
        const consumables = await API.get('/api/consumables');
        let service = null;
        if (id) {
            service = await API.get(`/api/services/${id}`);
        }

        const content = `
            <form id="serviceForm">
                <div class="form-group">
                    <label class="form-label">Service Name</label>
                    <input type="text" class="form-input" name="name" value="${service?.name||''}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Chair Time (hours)</label>
                        <input type="number" class="form-input" name="chair_time_hours" value="${service?.chair_time_hours||''}" step="0.25" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Doctor Hourly Fee</label>
                        <input type="number" class="form-input" name="doctor_hourly_fee" value="${service?.doctor_hourly_fee||''}" step="1" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">
                            <input type="checkbox" name="use_default_profit" ${service?.use_default_profit?'checked':''} onchange="toggleCustomProfit(this)">
                            Use Default Profit?
                        </label>
                    </div>
                    <div class="form-group" id="customProfitGroup" style="display:${service?.use_default_profit?'none':'block'}">
                        <label class="form-label">Custom Profit %</label>
                        <input type="number" class="form-input" name="custom_profit_percent" value="${service?.custom_profit_percent||''}" step="1">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Equipment (Optional)</label>
                        <select class="form-select" name="equipment_id">
                            <option value="">None</option>
                            ${equipment.filter(e => e.allocation_type === 'per-hour').map(e =>
                                `<option value="${e.id}" ${service?.equipment_id===e.id?'selected':''}>${e.asset_name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Equipment Hours Used</label>
                        <input type="number" class="form-input" name="equipment_hours_used" value="${service?.equipment_hours_used||''}" step="0.1">
                    </div>
                </div>
                <div class="modal-footer" style="margin:1.5rem -1.5rem -1.5rem;padding:1rem 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
            <script>
                function toggleCustomProfit(checkbox) {
                    document.getElementById('customProfitGroup').style.display = checkbox.checked ? 'none' : 'block';
                }
            </script>
        `;

        openModal(id ? 'Edit Service' : 'Add Service', content, 'modal-lg');

        document.getElementById('serviceForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(e.target));
            formData.chair_time_hours = parseFloat(formData.chair_time_hours);
            formData.doctor_hourly_fee = parseFloat(formData.doctor_hourly_fee);
            formData.use_default_profit = formData.use_default_profit ? 1 : 0;
            if (formData.custom_profit_percent) {
                formData.custom_profit_percent = parseFloat(formData.custom_profit_percent);
            }
            if (formData.equipment_id) {
                formData.equipment_id = parseInt(formData.equipment_id);
                if (formData.equipment_hours_used) {
                    formData.equipment_hours_used = parseFloat(formData.equipment_hours_used);
                }
            } else {
                delete formData.equipment_id;
                delete formData.equipment_hours_used;
            }

            formData.consumables = [];

            try {
                if (id) {
                    await API.put(`/api/services/${id}`, formData);
                } else {
                    await API.post('/api/services', formData);
                }
                showToast('Service saved');
                closeAllModals();
                APP.loadPage('services');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    async viewServicePrice(serviceId) {
        const price = await API.get(`/api/services/${serviceId}/price`);

        const content = `
            <div style="font-family:monospace;background:#f9fafb;padding:1.5rem;border-radius:8px;">
                <div style="text-align:center;margin-bottom:1.5rem;">
                    <h2 style="margin:0;color:#667eea;">🦷 ${price.service_name}</h2>
                </div>
                <div style="border-top:2px solid #667eea;padding-top:1rem;">
                    <h3 style="color:#667eea;">COST BREAKDOWN</h3>
                    <table style="width:100%;margin-top:1rem;">
                        <tr><td>Chair Time Cost (${price.chair_hourly_rate}/hr)</td><td style="text-align:right;">${formatCurrency(price.chair_time_cost)}</td></tr>
                        <tr><td>Doctor Fee</td><td style="text-align:right;">${formatCurrency(price.doctor_fee)}</td></tr>
                        <tr><td>Equipment Cost</td><td style="text-align:right;">${formatCurrency(price.equipment_cost)}</td></tr>
                        <tr><td>Direct Materials</td><td style="text-align:right;">${formatCurrency(price.materials_cost)}</td></tr>
                        <tr style="border-top:1px solid #ccc;font-weight:bold;"><td>TOTAL COST</td><td style="text-align:right;">${formatCurrency(price.total_cost)}</td></tr>
                    </table>
                </div>
                <div style="border-top:2px solid #667eea;padding-top:1rem;margin-top:1rem;">
                    <h3 style="color:#667eea;">PRICING</h3>
                    <table style="width:100%;margin-top:1rem;">
                        <tr><td>Profit (${price.profit_percent}%)</td><td style="text-align:right;">${formatCurrency(price.profit_amount)}</td></tr>
                        <tr><td>Price Before VAT</td><td style="text-align:right;">${formatCurrency(price.price_before_vat)}</td></tr>
                        <tr><td>VAT (${price.vat_percent}%)</td><td style="text-align:right;">${formatCurrency(price.vat_amount)}</td></tr>
                        <tr><td>Final Price</td><td style="text-align:right;">${formatCurrency(price.final_price)}</td></tr>
                        <tr style="border-top:2px solid #667eea;font-size:1.2em;font-weight:bold;color:#667eea;">
                            <td>ROUNDED PRICE</td>
                            <td style="text-align:right;">${formatCurrency(price.rounded_price)}</td>
                        </tr>
                    </table>
                </div>
            </div>
            <div class="modal-footer" style="margin:1.5rem -1.5rem -1.5rem;padding:1rem 1.5rem;">
                <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Close</button>
            </div>
        `;

        openModal('Service Price Calculation', content, 'modal-lg');
    },

    async deleteService(id) {
        if (confirm('Delete this service?')) {
            try {
                await API.delete(`/api/services/${id}`);
                showToast('Service deleted');
                APP.loadPage('services');
            } catch(err) {
                showToast(err.message, 'error');
            }
        }
    },

    async priceList() {
        const priceList = await API.get('/api/price-list');
        const settings = await API.get('/api/settings/global');

        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Complete Price List</h3>
                    <button class="btn btn-primary" onclick="window.print()">🖨️ Print</button>
                </div>
                <div class="card-body" style="padding:0;">
                    ${priceList.length > 0 ? `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Service</th>
                                    <th>Materials Cost</th>
                                    <th>Total Cost</th>
                                    <th>Profit %</th>
                                    <th>Final Price</th>
                                    <th>Rounded</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${priceList.map(p => `
                                    <tr>
                                        <td><strong>${p.service_name}</strong></td>
                                        <td>${formatCurrency(p.materials_cost)}</td>
                                        <td>${formatCurrency(p.total_cost)}</td>
                                        <td><span class="badge badge-success">${p.profit_percent}%</span></td>
                                        <td>${formatCurrency(p.final_price)}</td>
                                        <td><strong style="color:#667eea;">${formatCurrency(p.rounded_price, settings.currency)}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">📋</div>
                            <h3>No Prices</h3>
                            <p>Add services to generate price list</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }
};

// Initialize app when loaded
window.addEventListener('DOMContentLoaded', () => APP.init());
