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

// Global storage for consumables (populated when service form opens)
window.serviceFormConsumables = [];

// Calculate unit cost for a consumable
window.getConsumableUnitCost = function(consumableId) {
    const consumables = window.serviceFormConsumables;
    const c = consumables.find(item => item.id == consumableId);
    if (!c) return 0;
    const unitsPerPack = (c.cases_per_pack || 1) * (c.units_per_case || 1);
    return (c.pack_cost || 0) / unitsPerPack;
};

// Update cost display for a consumable row
window.updateConsumableCost = function(row) {
    const select = row.querySelector('[data-consumable-select]');
    const qtyInput = row.querySelector('[data-consumable-quantity]');
    const costDisplay = row.querySelector('[data-consumable-cost]');
    if (!select || !qtyInput || !costDisplay) return;

    const consumableId = select.value;
    const quantity = parseFloat(qtyInput.value) || 0;

    if (consumableId && quantity > 0) {
        const unitCost = window.getConsumableUnitCost(consumableId);
        const totalCost = unitCost * quantity;
        costDisplay.textContent = formatCurrency(totalCost);
    } else {
        costDisplay.textContent = '-';
    }
};

// Toggle custom profit margin visibility
window.toggleCustomProfit = function(checkbox) {
    const customProfitGroup = document.getElementById('customProfitGroup');
    if (customProfitGroup) {
        customProfitGroup.style.display = checkbox.checked ? 'none' : 'block';
    }
};

// Toggle collapsible form sections
window.toggleFormSection = function(button) {
    const section = button.closest('.form-section-collapsible');
    const content = section.querySelector('.section-content');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    button.setAttribute('aria-expanded', !isExpanded);
    section.classList.toggle('is-open', !isExpanded);

    if (isExpanded) {
        content.setAttribute('hidden', '');
    } else {
        content.removeAttribute('hidden');
    }
};

// Update packaging preview in consumable form
window.updatePackagingPreview = function() {
    const packCost = parseFloat(document.getElementById('packCostInput')?.value) || 0;
    const cases = parseInt(document.getElementById('casesInput')?.value) || 1;
    const units = parseInt(document.getElementById('unitsInput')?.value) || 1;

    const totalUnits = cases * units;
    const unitCost = packCost > 0 ? (packCost / totalUnits) : 0;

    // Update preview displays
    const casesPreview = document.getElementById('casesPreview');
    const unitsPreview = document.getElementById('unitsPreview');
    const packCostResult = document.getElementById('packCostResult');
    const totalUnitsResult = document.getElementById('totalUnitsResult');
    const unitCostResult = document.getElementById('unitCostResult');

    if (casesPreview) casesPreview.textContent = cases;
    if (unitsPreview) unitsPreview.textContent = units;
    if (packCostResult) packCostResult.textContent = packCost.toFixed(2);
    if (totalUnitsResult) totalUnitsResult.textContent = totalUnits;
    if (unitCostResult) unitCostResult.textContent = unitCost.toFixed(3);
};

// Global function to add consumable row (defined here so it's always available)
window.addConsumableRow = function() {
    const container = document.getElementById('consumablesContainer');
    if (!container) {
        console.error('consumablesContainer not found');
        return;
    }

    // Remove "no consumables" message if it exists
    const emptyMsg = container.querySelector('.empty-consumables');
    if (emptyMsg) {
        emptyMsg.remove();
    }

    const consumables = window.serviceFormConsumables;
    if (!consumables || consumables.length === 0) {
        alert('Please add consumables to your library first before adding them to services.');
        return;
    }

    const row = document.createElement('div');
    row.className = 'consumable-row';
    row.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center;';
    row.innerHTML = '<select class="form-select" style="flex:2;" data-consumable-select>' +
        '<option value="">Select consumable...</option>' +
        consumables.map(c => '<option value="' + c.id + '">' + c.item_name + '</option>').join('') +
        '</select>' +
        '<input type="number" class="form-input" style="flex:1;" placeholder="Units" value="1" data-consumable-quantity min="0.1" step="0.1" required>' +
        '<span data-consumable-cost style="flex:1;text-align:right;font-weight:500;color:var(--gray-600);min-width:100px;">-</span>' +
        '<button type="button" class="btn btn-sm btn-ghost" onclick="this.parentElement.remove()" title="Remove">✕</button>';

    // Add event listeners to update cost
    const select = row.querySelector('[data-consumable-select]');
    const qtyInput = row.querySelector('[data-consumable-quantity]');
    select.addEventListener('change', () => window.updateConsumableCost(row));
    qtyInput.addEventListener('input', () => window.updateConsumableCost(row));

    // Insert at top instead of bottom
    container.insertBefore(row, container.firstChild);
};

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

        const content = document.getElementById('pageContent');
        content.innerHTML = '<div style="padding:2rem;text-align:center;">Loading...</div>';

        // Convert kebab-case to camelCase for Pages object
        const pageKey = page.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const html = await Pages[pageKey]();
        content.innerHTML = html;
    }
};

const Pages = {
    async dashboard() {
        const stats = await API.get('/api/dashboard/stats');
        const priceList = await API.get('/api/price-list');
        const topServices = priceList.slice(0, 5);

        // Calculate pricing health metrics
        const underpriced = priceList.filter(s => s.current_price && s.current_price < s.rounded_price * 0.95).length;
        const optimal = priceList.filter(s => !s.current_price || (s.current_price >= s.rounded_price * 0.95 && s.current_price <= s.rounded_price * 1.05)).length;
        const potentialRevenue = priceList.reduce((sum, s) => {
            if (s.current_price && s.current_price < s.rounded_price) {
                return sum + (s.rounded_price - s.current_price);
            }
            return sum;
        }, 0);

        return `
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: var(--primary-100); color: var(--primary-600);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                                <rect x="9" y="3" width="6" height="4" rx="1"/>
                            </svg>
                        </span>
                        <span class="metric-label">Total Services</span>
                    </div>
                    <div class="metric-value">${stats.total_services}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">Active dental procedures</span>
                    </div>
                </div>

                ${underpriced > 0 ? `
                <div class="metric-card metric-highlight">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #fef3c7; color: var(--warning);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 22h20L12 2zm0 15a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-1-2V9h2v6h-2z"/>
                            </svg>
                        </span>
                        <span class="metric-label">Needs Attention</span>
                    </div>
                    <div class="metric-value">${underpriced}</div>
                    <div class="metric-footer">
                        <span class="metric-action" onclick="APP.loadPage('price-list')">Services underpriced →</span>
                    </div>
                </div>
                ` : `
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #d1fae5; color: var(--success);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </span>
                        <span class="metric-label">Pricing Health</span>
                    </div>
                    <div class="metric-value" style="color: var(--success);">Good</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">All services properly priced</span>
                    </div>
                </div>
                `}

                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #dbeafe; color: var(--primary-600);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </span>
                        <span class="metric-label">Chair Hourly Rate</span>
                    </div>
                    <div class="metric-value currency">${formatCurrency(stats.chair_hourly_rate)}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${stats.effective_hours.toFixed(0)} effective hours/month</span>
                    </div>
                </div>

                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #fce7f3; color: #db2777;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="1" x2="12" y2="23"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </span>
                        <span class="metric-label">Monthly Fixed Costs</span>
                    </div>
                    <div class="metric-value currency">${formatCurrency(stats.total_fixed_monthly)}</div>
                    <div class="metric-footer">
                        <span class="metric-action" onclick="APP.loadPage('settings')">View breakdown →</span>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.5rem; vertical-align: -4px;">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                        </svg>
                        Quick Start Guide
                    </h3>
                </div>
                <div class="card-body">
                    <p style="color:var(--gray-700);margin-bottom:1.5rem;">
                        This calculator uses <strong>Cost-Plus pricing</strong> to ensure all your costs are covered.
                        Follow these steps to set up your clinic and calculate accurate prices:
                    </p>
                    <div class="setup-steps">
                        <div class="setup-step" onclick="APP.loadPage('settings')">
                            <div class="step-number">1</div>
                            <div class="step-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                                    <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                                    <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                                    <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
                                </svg>
                            </div>
                            <h4>Configure Settings</h4>
                            <p>Add rent, utilities, salaries, and equipment. Set your working hours and capacity.</p>
                        </div>
                        <div class="setup-step" onclick="APP.loadPage('consumables')">
                            <div class="step-number">2</div>
                            <div class="step-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                                </svg>
                            </div>
                            <h4>Add Consumables</h4>
                            <p>Create a library of materials like gloves, anesthetics, gauze, and sutures.</p>
                        </div>
                        <div class="setup-step" onclick="APP.loadPage('services')">
                            <div class="step-number">3</div>
                            <div class="step-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M12 2C8 2 6 5 6 8c0 2.5 1 4 2 5.5S10 16 10 18c0 1.5-.5 3-1.5 4h7c-1-1-1.5-2.5-1.5-4 0-2 1-3.5 2-5.5s2-3 2-5.5c0-3-2-6-6-6z"/>
                                    <path d="M9 22h6"/>
                                </svg>
                            </div>
                            <h4>Create Services</h4>
                            <p>Define procedures with chair time, doctor fees, and materials. Prices calculated automatically!</p>
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
            <div class="card" style="background:#e0f2fe;border-color:#38bdf8;">
                <div class="card-header" style="background:#7dd3fc;">
                    <h3 class="card-title">💡 How Cost-Plus Pricing Works</h3>
                </div>
                <div class="card-body">
                    <p style="margin-bottom:0.75rem;"><strong>The system calculates your service prices in 4 steps:</strong></p>
                    <ol style="margin-left:1.25rem;line-height:1.8;">
                        <li><strong>Fixed Costs:</strong> Monthly expenses (rent, utilities, salaries) are spread across your available chair hours</li>
                        <li><strong>Service Cost:</strong> Chair time cost + Doctor fees + Equipment depreciation + Direct materials (consumables)</li>
                        <li><strong>Add Profit:</strong> Your desired profit margin is added to the total cost</li>
                        <li><strong>Add VAT:</strong> Final tax is applied and the price is rounded for convenience</li>
                    </ol>
                    <p style="margin-top:0.75rem;color:var(--gray-700);"><em>This ensures every service covers its costs and generates the profit margin you set!</em></p>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">Global Settings</h3>
                </div>
                <div class="card-body">
                    <form id="globalSettingsForm" class="form-row">
                        <div class="form-group">
                            <label class="form-label">Currency</label>
                            <select class="form-select" name="currency">
                                <option value="EGP" ${settings.currency==='EGP'?'selected':''}>EGP - Egyptian Pound</option>
                                <option value="USD" ${settings.currency==='USD'?'selected':''}>USD - US Dollar</option>
                                <option value="EUR" ${settings.currency==='EUR'?'selected':''}>EUR - Euro</option>
                            </select>
                            <small style="color:var(--gray-600);">Currency displayed in price calculations</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">VAT % (Value Added Tax)</label>
                            <input type="number" class="form-input" name="vat_percent" value="${settings.vat_percent}" step="0.1" min="0" max="100" placeholder="e.g., 14">
                            <small style="color:var(--gray-600);">Tax added to final price (e.g., 14% in Egypt)</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Default Profit Margin %</label>
                            <input type="number" class="form-input" name="default_profit_percent" value="${settings.default_profit_percent}" step="1" min="0" max="200" placeholder="e.g., 40">
                            <small style="color:var(--gray-600);">Profit added to cost (typically 30-50%)</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Round Final Price To</label>
                            <select class="form-select" name="rounding_nearest">
                                ${[1,5,10,50,100].map(v => `<option value="${v}" ${settings.rounding_nearest===v?'selected':''}>Nearest ${v}</option>`).join('')}
                            </select>
                            <small style="color:var(--gray-600);">Round prices for cleaner numbers (e.g., 345 → 350)</small>
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
                            <label class="form-label">Number of Dental Chairs</label>
                            <input type="number" class="form-input" name="chairs" value="${capacity.chairs}" min="1" placeholder="e.g., 3">
                            <small style="color:var(--gray-600);">Treatment chairs in your clinic</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Working Days per Month</label>
                            <input type="number" class="form-input" name="days_per_month" value="${capacity.days_per_month}" min="1" placeholder="e.g., 24">
                            <small style="color:var(--gray-600);">Operational days (e.g., 24 for 6 days/week)</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Working Hours per Day</label>
                            <input type="number" class="form-input" name="hours_per_day" value="${capacity.hours_per_day}" min="1" step="0.5" placeholder="e.g., 8">
                            <small style="color:var(--gray-600);">Daily operating hours per chair</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Utilization Rate %</label>
                            <input type="number" class="form-input" name="utilization_percent" value="${capacity.utilization_percent}" min="1" max="100" placeholder="e.g., 80">
                            <small style="color:var(--gray-600);">Expected chair occupancy (70-85% is typical)</small>
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
                    <label class="form-label">Cost Category</label>
                    <input type="text" class="form-input" name="category" value="${cost?.category||''}" placeholder="e.g., Rent, Electricity, Internet" required>
                    <small style="color:var(--gray-600);">Examples: Rent, Utilities, Insurance, Cleaning, Security</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Monthly Amount</label>
                    <input type="number" class="form-input" name="monthly_amount" value="${cost?.monthly_amount||''}" step="0.01" placeholder="e.g., 5000" required>
                    <small style="color:var(--gray-600);">Total monthly cost for this category</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Include in calculations?</label>
                    <select class="form-select" name="included">
                        <option value="1" ${cost?.included?'selected':''}>Yes - Include in pricing</option>
                        <option value="0" ${!cost?.included?'selected':''}>No - Track only</option>
                    </select>
                    <small style="color:var(--gray-600);">Exclude costs you want to track but not include in pricing</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes (Optional)</label>
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
                    <label class="form-label">Role or Staff Name</label>
                    <input type="text" class="form-input" name="role_name" value="${salary?.role_name||''}" placeholder="e.g., Receptionist, Dental Assistant" required>
                    <small style="color:var(--gray-600);">Examples: Dentist, Nurse, Receptionist, Cleaner</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Monthly Salary</label>
                    <input type="number" class="form-input" name="monthly_salary" value="${salary?.monthly_salary||''}" step="0.01" placeholder="e.g., 3000" required>
                    <small style="color:var(--gray-600);">Total monthly salary including benefits</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Include in calculations?</label>
                    <select class="form-select" name="included">
                        <option value="1" ${salary?.included?'selected':''}>Yes - Include in pricing</option>
                        <option value="0" ${!salary?.included?'selected':''}>No - Track only</option>
                    </select>
                    <small style="color:var(--gray-600);">Exclude salaries you want to track but not include in pricing</small>
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
                    <label class="form-label">Equipment Name</label>
                    <input type="text" class="form-input" name="asset_name" value="${equipment?.asset_name||''}" placeholder="e.g., X-Ray Machine, Dental Chair" required>
                    <small style="color:var(--gray-600);">Examples: X-Ray, Sterilizer, Compressor, Laser</small>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Purchase Cost</label>
                        <input type="number" class="form-input" name="purchase_cost" value="${equipment?.purchase_cost||''}" step="0.01" placeholder="e.g., 50000" required>
                        <small style="color:var(--gray-600);">Total cost when purchased</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Expected Life (years)</label>
                        <input type="number" class="form-input" name="life_years" value="${equipment?.life_years||10}" min="1" placeholder="e.g., 10" required>
                        <small style="color:var(--gray-600);">How many years until replacement</small>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Cost Allocation Method</label>
                        <select class="form-select" name="allocation_type" id="allocationType" onchange="toggleUsageHours()" required>
                            <option value="fixed" ${equipment?.allocation_type==='fixed'?'selected':''}>Fixed - Spread across all services</option>
                            <option value="per-hour" ${equipment?.allocation_type==='per-hour'?'selected':''}>Per-Hour - Charge only when used</option>
                        </select>
                        <small style="color:var(--gray-600);">Fixed: Dental chairs, general tools | Per-Hour: X-Ray, specialized machines</small>
                    </div>
                    <div class="form-group" id="usageHoursGroup" style="display:${equipment?.allocation_type==='per-hour'?'block':'none'}">
                        <label class="form-label">Expected Monthly Usage Hours</label>
                        <input type="number" class="form-input" name="monthly_usage_hours" value="${equipment?.monthly_usage_hours||''}" step="0.1" placeholder="e.g., 20">
                        <small style="color:var(--gray-600);">How many hours per month you expect to use this equipment</small>
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
            <div class="card" style="background:#fef3c7;border-color:#fbbf24;">
                <div class="card-header" style="background:#fde68a;">
                    <h3 class="card-title">📦 About Consumables</h3>
                </div>
                <div class="card-body">
                    <p><strong>Consumables are materials used during dental procedures.</strong></p>
                    <p style="margin-top:0.5rem;margin-bottom:0.5rem;">Examples: Gloves, Gauze, Anesthetic cartridges, Sutures, Cotton rolls, Dental floss</p>
                    <p style="margin-bottom:0;color:var(--gray-700);">
                        <strong>How it works:</strong> You define how materials are packaged (pack → cases → units).
                        The system calculates the per-unit cost, then when you add a service, you specify how many units are used.
                    </p>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
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
                                    <th>Per Unit Cost</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${consumables.map(c => {
                                    const perUnitCost = c.pack_cost / c.cases_per_pack / c.units_per_case;
                                    return `
                                        <tr>
                                            <td><strong>${c.item_name}</strong></td>
                                            <td>${formatCurrency(c.pack_cost)}</td>
                                            <td>${c.cases_per_pack}</td>
                                            <td>${c.units_per_case}</td>
                                            <td><strong>${formatCurrency(perUnitCost)}</strong></td>
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
                    <label class="form-label required">Consumable Item Name</label>
                    <input type="text" class="form-input" name="item_name" value="${consumable?.item_name||''}" placeholder="e.g., Latex Gloves, Anesthetic Cartridge" required>
                </div>

                <!-- Packaging Calculator with Visual Flow -->
                <div class="packaging-calculator">
                    <div class="packaging-header">
                        <span class="packaging-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -3px; margin-right: 0.5rem;">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            </svg>
                            Packaging Breakdown
                        </span>
                        <span class="packaging-help">How is this item packaged?</span>
                    </div>

                    <div class="packaging-flow">
                        <!-- Step 1: Pack Cost -->
                        <div class="packaging-step">
                            <div class="step-badge">1</div>
                            <div class="step-content">
                                <label class="form-label required">Pack Cost</label>
                                <div class="input-with-unit">
                                    <input type="number" class="form-input" name="pack_cost" id="packCostInput" value="${consumable?.pack_cost||''}" step="0.01" placeholder="e.g., 180" required oninput="window.updatePackagingPreview()">
                                    <span class="input-unit">EGP</span>
                                </div>
                                <small>Total price for one pack from supplier</small>
                            </div>
                            <div class="step-visual">
                                <div class="visual-box">📦 1 Pack</div>
                            </div>
                        </div>

                        <div class="packaging-arrow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M19 12l-7 7-7-7"/>
                            </svg>
                            <span>contains</span>
                        </div>

                        <!-- Step 2: Cases per Pack -->
                        <div class="packaging-step">
                            <div class="step-badge">2</div>
                            <div class="step-content">
                                <label class="form-label required">Cases per Pack</label>
                                <input type="number" class="form-input" name="cases_per_pack" id="casesInput" value="${consumable?.cases_per_pack||1}" min="1" placeholder="e.g., 10" required oninput="window.updatePackagingPreview()">
                                <small>How many boxes/cases inside the pack?</small>
                            </div>
                            <div class="step-visual">
                                <div class="visual-box">📦 × <span id="casesPreview">${consumable?.cases_per_pack||1}</span></div>
                            </div>
                        </div>

                        <div class="packaging-arrow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M19 12l-7 7-7-7"/>
                            </svg>
                            <span>each contains</span>
                        </div>

                        <!-- Step 3: Units per Case -->
                        <div class="packaging-step">
                            <div class="step-badge">3</div>
                            <div class="step-content">
                                <label class="form-label required">Units per Case</label>
                                <input type="number" class="form-input" name="units_per_case" id="unitsInput" value="${consumable?.units_per_case||1}" min="1" placeholder="e.g., 100" required oninput="window.updatePackagingPreview()">
                                <small>Individual items you use (e.g., 100 gloves)</small>
                            </div>
                            <div class="step-visual">
                                <div class="visual-box">🧤 × <span id="unitsPreview">${consumable?.units_per_case||1}</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- Live Calculation Result -->
                    <div class="packaging-result">
                        <div class="result-equation">
                            <span class="eq-part">EGP <span id="packCostResult">${consumable?.pack_cost||0}</span></span>
                            <span class="eq-operator">÷</span>
                            <span class="eq-part"><span id="totalUnitsResult">${(consumable?.cases_per_pack||1) * (consumable?.units_per_case||1)}</span> units</span>
                            <span class="eq-operator">=</span>
                            <span class="eq-final">
                                <strong>EGP <span id="unitCostResult">${consumable ? (consumable.pack_cost / consumable.cases_per_pack / consumable.units_per_case).toFixed(3) : '0.000'}</span></strong>
                                <small>per unit</small>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="margin:1.5rem -1.5rem -1.5rem;padding:1rem 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:0.25rem;">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Save Consumable
                    </button>
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
            <div class="card" style="background:#e0e7ff;border-color:#818cf8;">
                <div class="card-header" style="background:#c7d2fe;">
                    <h3 class="card-title">🦷 About Services</h3>
                </div>
                <div class="card-body">
                    <p><strong>Services are the dental procedures you offer to patients.</strong></p>
                    <p style="margin-top:0.75rem;margin-bottom:0.5rem;"><strong>What you need to configure:</strong></p>
                    <ul style="margin-left:1.25rem;line-height:1.6;">
                        <li><strong>Chair Time:</strong> How long the patient occupies the chair (affects fixed cost allocation)</li>
                        <li><strong>Doctor Fee:</strong> The dentist's compensation for this procedure</li>
                        <li><strong>Equipment:</strong> Any per-hour equipment used (like X-Ray machines)</li>
                        <li><strong>Consumables:</strong> Materials consumed during the procedure (gloves, anesthetic, etc.)</li>
                    </ul>
                    <p style="margin-top:0.5rem;color:var(--gray-700);"><em>Click the 💰 button to see the complete cost breakdown and calculated price!</em></p>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
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
        // Store consumables globally so addConsumableRow can access them
        window.serviceFormConsumables = consumables;

        let service = null;
        if (id) {
            service = await API.get(`/api/services/${id}`);
        }

        // Count consumables for badge
        const consumablesCount = service?.consumables?.length || 0;
        const hasEquipment = service?.equipment_id ? true : false;
        const hasCustomProfit = !(service?.use_default_profit === undefined || service?.use_default_profit === null || service?.use_default_profit == 1 || service?.use_default_profit === true);

        const content = `
            <form id="serviceForm">
                <!-- Essential Fields Section -->
                <section class="form-section-essential">
                    <div class="form-group">
                        <label class="form-label required">Service Name</label>
                        <input type="text" class="form-input" name="name" value="${service?.name||''}" placeholder="e.g., Tooth Extraction, Root Canal, Cleaning" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label required">Chair Time</label>
                            <div class="input-with-unit">
                                <input type="number" class="form-input" name="chair_time_hours" value="${service?.chair_time_hours||''}" step="0.25" min="0.25" placeholder="e.g., 1.5" required>
                                <span class="input-unit">hours</span>
                            </div>
                            <div class="quick-options">
                                <button type="button" class="quick-btn" onclick="document.querySelector('[name=chair_time_hours]').value='0.25'">15min</button>
                                <button type="button" class="quick-btn" onclick="document.querySelector('[name=chair_time_hours]').value='0.5'">30min</button>
                                <button type="button" class="quick-btn" onclick="document.querySelector('[name=chair_time_hours]').value='1'">1hr</button>
                                <button type="button" class="quick-btn" onclick="document.querySelector('[name=chair_time_hours]').value='1.5'">1.5hr</button>
                                <button type="button" class="quick-btn" onclick="document.querySelector('[name=chair_time_hours]').value='2'">2hr</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Doctor Fee per Hour</label>
                            <div class="input-with-unit">
                                <input type="number" class="form-input" name="doctor_hourly_fee" value="${service?.doctor_hourly_fee||''}" step="1" placeholder="e.g., 500" required>
                                <span class="input-unit">EGP/hr</span>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Current Market Price</label>
                        <div class="input-with-unit">
                            <input type="number" class="form-input" name="current_price" value="${service?.current_price||''}" step="1" placeholder="What you currently charge">
                            <span class="input-unit">EGP</span>
                        </div>
                        <small style="color:var(--gray-500);font-size:0.8125rem;">Optional - Used to compare with calculated price</small>
                    </div>
                </section>

                <!-- Collapsible: Materials & Consumables -->
                <section class="form-section-collapsible ${consumablesCount > 0 ? 'is-open' : ''}">
                    <button type="button" class="section-toggle" aria-expanded="${consumablesCount > 0 ? 'true' : 'false'}" onclick="window.toggleFormSection(this)">
                        <span class="toggle-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                        </span>
                        <span class="toggle-title">Materials & Consumables</span>
                        <span class="toggle-badge">${consumablesCount > 0 ? consumablesCount + ' items' : 'Optional'}</span>
                    </button>
                    <div class="section-content" ${consumablesCount > 0 ? '' : 'hidden'}>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                            <small style="color:var(--gray-600);">Add materials used in this service (e.g., 2 gloves, 1 cartridge)</small>
                            <button type="button" class="btn btn-sm btn-primary" onclick="addConsumableRow()">+ Add</button>
                        </div>
                        <div style="display:flex;gap:0.5rem;margin-bottom:0.25rem;padding:0 0.25rem;font-size:0.75rem;color:var(--gray-500);font-weight:600;">
                            <span style="flex:2;">Consumable</span>
                            <span style="flex:1;">Units</span>
                            <span style="flex:1;text-align:right;min-width:80px;">Cost</span>
                            <span style="width:32px;"></span>
                        </div>
                        <div id="consumablesContainer">
                            ${service?.consumables?.length > 0 ? service.consumables.map(sc => {
                                const cons = consumables.find(c => c.id === sc.consumable_id);
                                const unitCost = cons ? (cons.pack_cost || 0) / (cons.cases_per_pack || 1) / (cons.units_per_case || 1) : 0;
                                const totalCost = unitCost * sc.quantity;
                                return `
                                <div class="consumable-row" style="display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center;">
                                    <select class="form-select" style="flex:2;" data-consumable-select onchange="window.updateConsumableCost(this.parentElement)">
                                        <option value="">Select consumable...</option>
                                        ${consumables.map(c =>
                                            `<option value="${c.id}" ${sc.consumable_id===c.id?'selected':''}>${c.item_name}</option>`
                                        ).join('')}
                                    </select>
                                    <input type="number" class="form-input" style="flex:1;" placeholder="Units" value="${sc.quantity}" data-consumable-quantity min="0.1" step="0.1" required oninput="window.updateConsumableCost(this.parentElement)">
                                    <span data-consumable-cost style="flex:1;text-align:right;font-weight:500;color:var(--gray-600);min-width:80px;">${formatCurrency(totalCost)}</span>
                                    <button type="button" class="btn btn-sm btn-ghost" onclick="this.parentElement.remove()" title="Remove">✕</button>
                                </div>`;
                            }).join('') : '<div class="empty-consumables" style="color:var(--gray-500);text-align:center;padding:1rem;background:var(--gray-50);border-radius:var(--radius);border:1px dashed var(--gray-300);">No consumables added yet</div>'}
                        </div>
                    </div>
                </section>

                <!-- Collapsible: Special Equipment -->
                <section class="form-section-collapsible ${hasEquipment ? 'is-open' : ''}">
                    <button type="button" class="section-toggle" aria-expanded="${hasEquipment ? 'true' : 'false'}" onclick="window.toggleFormSection(this)">
                        <span class="toggle-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                        </span>
                        <span class="toggle-title">Special Equipment</span>
                        <span class="toggle-badge">${hasEquipment ? 'Configured' : 'Optional'}</span>
                    </button>
                    <div class="section-content" ${hasEquipment ? '' : 'hidden'}>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Equipment</label>
                                <select class="form-select" name="equipment_id">
                                    <option value="">None - No special equipment</option>
                                    ${equipment.filter(e => e.allocation_type === 'per-hour').map(e =>
                                        `<option value="${e.id}" ${service?.equipment_id===e.id?'selected':''}>${e.asset_name}</option>`
                                    ).join('')}
                                </select>
                                <small style="color:var(--gray-500);font-size:0.8125rem;">Per-hour equipment like X-Ray machines</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Usage Time</label>
                                <div class="input-with-unit">
                                    <input type="number" class="form-input" name="equipment_hours_used" value="${service?.equipment_hours_used||''}" step="0.1" placeholder="e.g., 0.25">
                                    <span class="input-unit">hours</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Collapsible: Pricing Options -->
                <section class="form-section-collapsible ${hasCustomProfit ? 'is-open' : ''}">
                    <button type="button" class="section-toggle" aria-expanded="${hasCustomProfit ? 'true' : 'false'}" onclick="window.toggleFormSection(this)">
                        <span class="toggle-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                        </span>
                        <span class="toggle-title">Custom Pricing</span>
                        <span class="toggle-badge">${hasCustomProfit ? service.custom_profit_percent + '%' : 'Using default'}</span>
                    </button>
                    <div class="section-content" ${hasCustomProfit ? '' : 'hidden'}>
                        <div class="form-group">
                            <label class="form-label" style="display:flex;align-items:center;gap:0.5rem;">
                                <input type="checkbox" name="use_default_profit" ${!hasCustomProfit ? 'checked' : ''} onchange="window.toggleCustomProfit(this)" style="width:18px;height:18px;">
                                <span>Use Default Profit Margin</span>
                            </label>
                        </div>
                        <div class="form-group" id="customProfitGroup" style="display:${hasCustomProfit ? 'block' : 'none'}">
                            <label class="form-label">Custom Profit Margin</label>
                            <div class="input-with-unit">
                                <input type="number" class="form-input" name="custom_profit_percent" value="${service?.custom_profit_percent||''}" step="1" placeholder="e.g., 50">
                                <span class="input-unit">%</span>
                            </div>
                            <small style="color:var(--gray-500);font-size:0.8125rem;">Override the global profit setting for this service only</small>
                        </div>
                    </div>
                </section>

                <div class="modal-footer" style="margin:1.5rem -1.5rem -1.5rem;padding:1rem 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:0.25rem;">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Save Service
                    </button>
                </div>
            </form>
        `;

        openModal(id ? 'Edit Service' : 'Add Service', content, 'modal-lg');

        document.getElementById('serviceForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(e.target));
            formData.chair_time_hours = parseFloat(formData.chair_time_hours);
            formData.doctor_hourly_fee = parseFloat(formData.doctor_hourly_fee);
            // Checkbox is only in FormData when checked, so if it's undefined, it was unchecked
            formData.use_default_profit = formData.use_default_profit === 'on' ? 1 : 0;
            if (formData.custom_profit_percent) {
                formData.custom_profit_percent = parseFloat(formData.custom_profit_percent);
            }
            if (formData.current_price) {
                formData.current_price = parseFloat(formData.current_price);
            } else {
                delete formData.current_price;
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

            // Collect consumables data
            formData.consumables = [];
            document.querySelectorAll('.consumable-row').forEach(row => {
                const select = row.querySelector('[data-consumable-select]');
                const quantity = row.querySelector('[data-consumable-quantity]');
                if (select.value && quantity.value) {
                    formData.consumables.push({
                        consumable_id: parseInt(select.value),
                        quantity: parseFloat(quantity.value)
                    });
                }
            });

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
        const service = await API.get(`/api/services/${serviceId}`);

        let varianceSection = '';
        if (service.current_price) {
            const variance = price.rounded_price - service.current_price;
            const variancePercent = ((variance / service.current_price) * 100).toFixed(1);
            const varianceColor = variance > 0 ? '#ef4444' : '#10b981';
            const varianceIcon = variance > 0 ? '▲' : '▼';

            varianceSection = `
                <div style="border-top:2px solid #667eea;padding-top:1rem;margin-top:1rem;">
                    <h3 style="color:#667eea;">PRICE COMPARISON</h3>
                    <table style="width:100%;margin-top:1rem;">
                        <tr><td>Current Price</td><td style="text-align:right;">${formatCurrency(service.current_price)}</td></tr>
                        <tr><td>Calculated Price</td><td style="text-align:right;">${formatCurrency(price.rounded_price)}</td></tr>
                        <tr style="border-top:1px solid #ccc;font-weight:bold;color:${varianceColor};">
                            <td>Variance</td>
                            <td style="text-align:right;">${varianceIcon} ${formatCurrency(Math.abs(variance))} (${Math.abs(variancePercent)}%)</td>
                        </tr>
                    </table>
                    <p style="margin-top:0.5rem;font-size:0.875rem;color:#64748b;">
                        ${variance > 0 ? '⚠️ Calculated price is higher - you may be undercharging' : '✅ Calculated price is lower - you have good margin'}
                    </p>
                </div>
            `;
        }

        const content = `
            <div style="font-family:monospace;background:#f9fafb;padding:1.5rem;border-radius:8px;">
                <div style="text-align:center;margin-bottom:1.5rem;">
                    <h2 style="margin:0;color:#667eea;">🦷 ${price.service_name}</h2>
                </div>
                <div style="border-top:2px solid #667eea;padding-top:1rem;">
                    <h3 style="color:#667eea;">COST BREAKDOWN</h3>
                    <table style="width:100%;margin-top:1rem;">
                        <tr>
                            <td>
                                Chair Time Cost (${formatCurrency(price.chair_hourly_rate)}/hr)
                                <div style="font-size:0.7rem;color:#64748b;font-family:sans-serif;margin-top:0.5rem;background:#f1f5f9;padding:0.5rem;border-radius:6px;">
                                    <div style="font-weight:600;margin-bottom:0.25rem;">💡 Chair Hourly Rate Breakdown:</div>
                                    <div style="display:flex;justify-content:space-between;"><span>🏢 Fixed Costs (rent, utilities)</span><span>${formatCurrency(price.monthly_fixed_costs)}</span></div>
                                    <div style="display:flex;justify-content:space-between;"><span>👥 Salaries</span><span>${formatCurrency(price.monthly_salaries)}</span></div>
                                    <div style="display:flex;justify-content:space-between;"><span>🔧 Equipment Depreciation</span><span>${formatCurrency(price.monthly_depreciation)}</span></div>
                                    <div style="display:flex;justify-content:space-between;border-top:1px dashed #cbd5e1;margin-top:0.25rem;padding-top:0.25rem;font-weight:600;"><span>Total Monthly</span><span>${formatCurrency(price.total_monthly_fixed)}</span></div>
                                    <div style="margin-top:0.25rem;color:#667eea;font-weight:500;">÷ ${price.effective_hours.toFixed(0)} effective hours = ${formatCurrency(price.chair_hourly_rate)}/hr</div>
                                </div>
                            </td>
                            <td style="text-align:right;vertical-align:top;">${formatCurrency(price.chair_time_cost)}</td>
                        </tr>
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
                            <td>RECOMMENDED PRICE</td>
                            <td style="text-align:right;">${formatCurrency(price.rounded_price)}</td>
                        </tr>
                    </table>
                </div>
                ${varianceSection}
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

        // Calculate summary statistics
        const servicesWithPrice = priceList.filter(p => p.current_price);
        const underpriced = servicesWithPrice.filter(p => p.rounded_price > p.current_price);
        const overpriced = servicesWithPrice.filter(p => p.rounded_price < p.current_price);
        const optimal = servicesWithPrice.filter(p => Math.abs(p.rounded_price - p.current_price) <= p.current_price * 0.05);

        // Calculate total potential revenue impact
        const totalVariance = servicesWithPrice.reduce((sum, p) => sum + (p.rounded_price - p.current_price), 0);

        // Helper function for variance display with health bar
        const getVarianceDisplay = (p) => {
            if (!p.current_price) return { html: '<span class="price-health-none">-</span>', status: 'none' };

            const variance = p.rounded_price - p.current_price;
            const variancePercent = ((variance / p.current_price) * 100);
            const absVariance = Math.abs(variance);
            const absPercent = Math.abs(variancePercent).toFixed(0);

            // Calculate position on the health bar (0-100)
            // -50% = 0, 0% = 50%, +50% = 100
            let position = 50 + (variancePercent / 2);
            position = Math.max(5, Math.min(95, position));

            if (Math.abs(variancePercent) <= 5) {
                return {
                    html: `<div class="price-health optimal">
                        <div class="health-bar">
                            <div class="health-zone zone-under"></div>
                            <div class="health-zone zone-optimal"></div>
                            <div class="health-zone zone-over"></div>
                            <div class="health-indicator" style="left:${position}%"></div>
                        </div>
                        <span class="health-label">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            Optimal ${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(0)}%
                        </span>
                    </div>`,
                    status: 'optimal'
                };
            } else if (variance > 0) {
                return {
                    html: `<div class="price-health underpriced">
                        <div class="health-bar">
                            <div class="health-zone zone-under"></div>
                            <div class="health-zone zone-optimal"></div>
                            <div class="health-zone zone-over"></div>
                            <div class="health-indicator" style="left:${position}%"></div>
                        </div>
                        <span class="health-label">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 15a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-1-2V9h2v6h-2z"/></svg>
                            Underpriced ${formatCurrency(absVariance)}
                        </span>
                    </div>`,
                    status: 'underpriced'
                };
            } else {
                return {
                    html: `<div class="price-health overpriced">
                        <div class="health-bar">
                            <div class="health-zone zone-under"></div>
                            <div class="health-zone zone-optimal"></div>
                            <div class="health-zone zone-over"></div>
                            <div class="health-indicator" style="left:${position}%"></div>
                        </div>
                        <span class="health-label">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                            Extra +${formatCurrency(absVariance)}
                        </span>
                    </div>`,
                    status: 'overpriced'
                };
            }
        };

        // Summary cards HTML
        const summaryHtml = servicesWithPrice.length > 0 ? `
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;">
                <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:1.25rem;border-radius:12px;text-align:center;">
                    <div style="font-size:2rem;font-weight:700;">${servicesWithPrice.length}</div>
                    <div style="font-size:0.875rem;opacity:0.9;">Services Tracked</div>
                </div>
                <div style="background:${underpriced.length > 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#22c55e,#16a34a)'};color:white;padding:1.25rem;border-radius:12px;text-align:center;">
                    <div style="font-size:2rem;font-weight:700;">${underpriced.length}</div>
                    <div style="font-size:0.875rem;opacity:0.9;">${underpriced.length > 0 ? '⚠️ Underpriced' : '✓ None Underpriced'}</div>
                </div>
                <div style="background:linear-gradient(135deg,#22c55e,#16a34a);color:white;padding:1.25rem;border-radius:12px;text-align:center;">
                    <div style="font-size:2rem;font-weight:700;">${optimal.length}</div>
                    <div style="font-size:0.875rem;opacity:0.9;">✓ Optimal Pricing</div>
                </div>
                <div style="background:${totalVariance > 0 ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#3b82f6,#2563eb)'};color:white;padding:1.25rem;border-radius:12px;text-align:center;">
                    <div style="font-size:1.5rem;font-weight:700;">${totalVariance > 0 ? '+' : ''}${formatCurrency(totalVariance)}</div>
                    <div style="font-size:0.875rem;opacity:0.9;">${totalVariance > 0 ? '💸 Lost Revenue' : '💰 Extra Margin'}</div>
                </div>
            </div>
            ${underpriced.length > 0 ? `
                <div style="background:linear-gradient(90deg,#fef3c7,#fde68a);border-left:4px solid #f59e0b;padding:1rem 1.25rem;border-radius:8px;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;">
                    <span style="font-size:2rem;">💡</span>
                    <div>
                        <strong style="color:#b45309;">Pricing Opportunity Found!</strong>
                        <p style="margin:0.25rem 0 0;color:#92400e;font-size:0.875rem;">
                            You have ${underpriced.length} service${underpriced.length > 1 ? 's' : ''} priced below calculated cost.
                            Adjusting could recover <strong>${formatCurrency(underpriced.reduce((sum, p) => sum + (p.rounded_price - p.current_price), 0))}</strong> per service rendered!
                        </p>
                    </div>
                </div>
            ` : `
                <div style="background:linear-gradient(90deg,#dcfce7,#bbf7d0);border-left:4px solid #22c55e;padding:1rem 1.25rem;border-radius:8px;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;">
                    <span style="font-size:2rem;">🏆</span>
                    <div>
                        <strong style="color:#15803d;">Excellent Pricing Strategy!</strong>
                        <p style="margin:0.25rem 0 0;color:#166534;font-size:0.875rem;">
                            All your services are priced at or above their calculated cost. Keep up the great work!
                        </p>
                    </div>
                </div>
            `}
        ` : '';

        return `
            <div class="card" style="background:#d1fae5;border-color:#34d399;">
                <div class="card-header" style="background:#a7f3d0;">
                    <h3 class="card-title">💰 Price List Overview</h3>
                </div>
                <div class="card-body">
                    <p><strong>This is your complete calculated price list for all services.</strong></p>
                    <p style="margin-top:0.5rem;color:var(--gray-700);">
                        Each price includes: Fixed costs (rent, salaries) + Service costs (chair time, doctor fee, equipment) +
                        Materials (consumables) + Your profit margin (${settings.default_profit_percent}%) + VAT (${settings.vat_percent}%)
                    </p>
                    <p style="margin-top:0.5rem;color:var(--gray-700);"><em>💡 Add "Current Market Price" to your services to see variance analysis!</em></p>
                </div>
            </div>

            ${summaryHtml}

            <div class="card" style="margin-top:1.5rem;">
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
                                    <th>Total Cost</th>
                                    <th>Profit</th>
                                    <th>Calculated Price</th>
                                    <th>Current Price</th>
                                    <th>Variance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${priceList.map(p => {
                                    const variance = getVarianceDisplay(p);
                                    return `
                                    <tr style="${variance.status === 'underpriced' ? 'background:#fffbeb;' : ''}">
                                        <td><strong>${p.service_name}</strong></td>
                                        <td>${formatCurrency(p.total_cost)}</td>
                                        <td><span class="badge badge-success">${p.profit_percent}%</span></td>
                                        <td><strong style="color:#667eea;">${formatCurrency(p.rounded_price)}</strong></td>
                                        <td>${p.current_price ? formatCurrency(p.current_price) : '<span style="color:#94a3b8;font-size:0.8rem;">Not set</span>'}</td>
                                        <td>${variance.html}</td>
                                    </tr>
                                `}).join('')}
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

            <div class="card" style="margin-top:1.5rem;background:#f0f9ff;border-color:#7dd3fc;">
                <div class="card-header" style="background:#e0f2fe;">
                    <h3 class="card-title">📊 Understanding Variance</h3>
                </div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
                        <div style="text-align:center;padding:1rem;">
                            <span style="background:#fef3c7;color:#b45309;padding:0.5rem 1rem;border-radius:20px;font-weight:600;">⚠️ Underpriced</span>
                            <p style="margin-top:0.75rem;font-size:0.875rem;color:var(--gray-600);">
                                Your current price is <strong>below</strong> the calculated cost-plus price. You may be losing money!
                            </p>
                        </div>
                        <div style="text-align:center;padding:1rem;">
                            <span style="background:#dcfce7;color:#15803d;padding:0.5rem 1rem;border-radius:20px;font-weight:600;">✓ Optimal</span>
                            <p style="margin-top:0.75rem;font-size:0.875rem;color:var(--gray-600);">
                                Your current price is within <strong>5%</strong> of the calculated price. Perfect balance!
                            </p>
                        </div>
                        <div style="text-align:center;padding:1rem;">
                            <span style="background:#dbeafe;color:#1d4ed8;padding:0.5rem 1rem;border-radius:20px;font-weight:600;">💪 Extra Margin</span>
                            <p style="margin-top:0.75rem;font-size:0.875rem;color:var(--gray-600);">
                                Your current price is <strong>above</strong> calculated cost. Great margin, but check competitiveness!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

// Initialize app when loaded
window.addEventListener('DOMContentLoaded', () => APP.init());
