/**
 * Dental Pricing Calculator - Main Application
 */

// ============================================
// Internationalization (i18n) System
// ============================================
const i18n = {
    currentLang: 'en',
    translations: {},
    initialized: false,

    async init() {
        const savedLang = localStorage.getItem('language') || 'en';
        await this.setLanguage(savedLang, false);
        this.initialized = true;
    },

    async loadTranslations(lang) {
        if (this.translations[lang]) return;
        try {
            const response = await fetch(`/static/translations/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
            this.translations[lang] = await response.json();
        } catch (error) {
            console.error(`Failed to load ${lang} translations:`, error);
            // Fallback to English if available
            if (lang !== 'en' && !this.translations['en']) {
                await this.loadTranslations('en');
            }
        }
    },

    async setLanguage(lang, saveToServer = true) {
        await this.loadTranslations(lang);
        this.currentLang = lang;
        localStorage.setItem('language', lang);

        // Update HTML attributes for RTL
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Update language toggle button text
        const langLabel = document.getElementById('langLabel');
        if (langLabel) {
            langLabel.textContent = this.t('language.toggle');
        }

        // Save preference to server if logged in
        if (saveToServer && typeof APP !== 'undefined' && APP.user) {
            API.put('/api/settings/language', { language: lang }).catch(() => {});
        }
    },

    // Get translation by key path (e.g., 'nav.dashboard')
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value === undefined) break;
            value = value[k];
        }

        // Fallback to English if translation missing
        if (value === undefined && this.currentLang !== 'en') {
            value = this.translations['en'];
            for (const k of keys) {
                if (value === undefined) break;
                value = value[k];
            }
        }

        // Return key if no translation found
        if (value === undefined) {
            console.warn(`Missing translation: ${key}`);
            return key;
        }

        // Replace parameters like {name} with values
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            return value.replace(/\{(\w+)\}/g, (_, param) => params[param] !== undefined ? params[param] : `{${param}}`);
        }

        return value;
    }
};

// Shorthand translation function
const t = (key, params) => i18n.t(key, params);
window.t = t; // Expose for embedded scripts

// Toggle language function
async function toggleLanguage() {
    const newLang = i18n.currentLang === 'en' ? 'ar' : 'en';
    await i18n.setLanguage(newLang);

    // Re-render current page with new language
    if (typeof APP !== 'undefined' && APP.currentPage) {
        APP.loadPage(APP.currentPage);
    }
}

// Tooltip helper function
function tooltip(text) {
    return `<span class="tooltip-trigger">?<span class="tooltip-content">${text}</span></span>`;
}

// Get localized name for items with name_ar field
// Supports both 'name' and 'service_name' as fallback keys
function getLocalizedName(item) {
    if (!item) return '';
    if (i18n.currentLang === 'ar' && item.name_ar) {
        return item.name_ar;
    }
    return item.name || item.service_name || '';
}
window.getLocalizedName = getLocalizedName; // Expose for embedded scripts

// ============================================
// API Module
// ============================================
const API = {
    async get(url) { const r = await fetch(url); if (!r.ok) throw new Error(await r.text()); return r.json(); },
    async post(url, data) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed'); } return r.json(); },
    async put(url, data) { const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed'); } return r.json(); },
    async delete(url) { const r = await fetch(url, { method: 'DELETE' }); if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed'); } return r.json(); }
};

function showToast(msg, type='success', options = {}) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;

    // Icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    let html = `<div class="toast-icon">${icons[type] || icons.success}</div><div class="toast-message">${msg}</div>`;

    // Add action button if provided (for undo functionality)
    if (options.action) {
        html += `<button class="toast-action" onclick="${options.action.onClick}">${options.action.text}</button>`;
    }

    // Add close button
    html += `<button class="toast-close" onclick="this.parentElement.remove()">×</button>`;

    t.innerHTML = html;
    c.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);

    // Auto-hide after duration (default 3s, longer for undo actions)
    const duration = options.duration || (options.action ? 5000 : 3000);
    const timeoutId = setTimeout(() => {
        t.classList.remove('show');
        t.classList.add('hide');
        setTimeout(() => t.remove(), 300);
    }, duration);

    // Store timeout ID so we can cancel it if user interacts
    t.dataset.timeoutId = timeoutId;

    return t;
}

function formatCurrency(amount, currency = 'EGP') {
    return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
}
window.formatCurrency = formatCurrency; // Expose for embedded scripts

// ============================================
// Form Validation Helpers
// ============================================
function validateInput(input, rules = {}) {
    const value = input.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (rules.required && !value) {
        isValid = false;
        errorMessage = t('validation.required') || 'This field is required';
    }

    // Min value validation
    if (isValid && rules.min !== undefined && parseFloat(value) < rules.min) {
        isValid = false;
        errorMessage = t('validation.minValue') || `Minimum value is ${rules.min}`;
    }

    // Max value validation
    if (isValid && rules.max !== undefined && parseFloat(value) > rules.max) {
        isValid = false;
        errorMessage = t('validation.maxValue') || `Maximum value is ${rules.max}`;
    }

    // Custom pattern validation
    if (isValid && rules.pattern && !rules.pattern.test(value)) {
        isValid = false;
        errorMessage = rules.patternMessage || t('validation.invalid') || 'Invalid format';
    }

    // Update UI
    input.classList.remove('valid', 'error');
    if (value) {
        input.classList.add(isValid ? 'valid' : 'error');
    }

    // Show/hide error message
    let errorEl = input.parentElement.querySelector('.form-error-message');
    if (!errorEl && !isValid) {
        errorEl = document.createElement('div');
        errorEl.className = 'form-error-message';
        input.parentElement.appendChild(errorEl);
    }

    if (errorEl) {
        if (!isValid) {
            errorEl.textContent = errorMessage;
            errorEl.classList.add('show');
        } else {
            errorEl.classList.remove('show');
        }
    }

    return isValid;
}

function setupRealtimeValidation(formId, validationRules = {}) {
    const form = document.getElementById(formId);
    if (!form) return;

    Object.keys(validationRules).forEach(fieldName => {
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (!input) return;

        // Validate on blur
        input.addEventListener('blur', () => {
            validateInput(input, validationRules[fieldName]);
        });

        // Validate on input (with debounce)
        let timeout;
        input.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (input.value.trim()) {
                    validateInput(input, validationRules[fieldName]);
                }
            }, 500);
        });
    });
}

// ============================================
// Skeleton Loading Helpers
// ============================================
function getSkeletonHTML(type = 'dashboard') {
    const skeletons = {
        dashboard: `
            <div style="padding: 2rem;">
                <div class="skeleton skeleton-title"></div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    ${Array(4).fill('<div class="skeleton-stat"><div class="skeleton skeleton-stat-icon"></div><div class="skeleton skeleton-stat-title"></div><div class="skeleton skeleton-stat-value"></div></div>').join('')}
                </div>
                <div class="skeleton skeleton-title" style="width: 30%;"></div>
                ${Array(5).fill('<div class="skeleton skeleton-row"></div>').join('')}
            </div>
        `,
        table: `
            <div style="padding: 2rem;">
                <div class="skeleton skeleton-title"></div>
                ${Array(8).fill('<div class="skeleton skeleton-row"></div>').join('')}
            </div>
        `,
        cards: `
            <div style="padding: 2rem;">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                    ${Array(6).fill('<div class="skeleton skeleton-card"></div>').join('')}
                </div>
            </div>
        `
    };

    return skeletons[type] || skeletons.table;
}

// ============================================
// Undo Delete Helper
// ============================================
let pendingDeletes = {};

async function deleteWithUndo(itemType, itemId, deleteFn, refreshFn) {
    const deleteId = `${itemType}-${itemId}-${Date.now()}`;

    // Find the row element to hide
    const row = document.querySelector(`tr[data-${itemType}-id="${itemId}"]`);
    let rowHTML = null;
    let rowParent = null;
    let rowNextSibling = null;

    if (row) {
        // Store row info for potential undo
        rowHTML = row.outerHTML;
        rowParent = row.parentElement;
        rowNextSibling = row.nextElementSibling;
        // Hide the row with a fade effect
        row.style.transition = 'opacity 0.3s';
        row.style.opacity = '0';
        setTimeout(() => {
            if (row.parentElement) {
                row.remove();
            }
        }, 300);
    }

    // Show undo toast
    const toastMessage = t(`toast.${itemType}DeletedWithUndo`) || `${itemType} deleted`;
    const toast = showToast(toastMessage, 'info', {
        action: {
            text: t('common.undo') || 'Undo',
            onClick: `cancelDelete('${deleteId}')`
        },
        duration: 5000
    });

    // Store delete info
    pendingDeletes[deleteId] = {
        itemType,
        itemId,
        deleteFn,
        refreshFn,
        toast,
        rowHTML,
        rowParent,
        rowNextSibling
    };

    // Actually delete after 5 seconds if not cancelled
    setTimeout(async () => {
        if (pendingDeletes[deleteId]) {
            try {
                await deleteFn(itemId);
                delete pendingDeletes[deleteId];
                // Don't show another toast, item already removed from UI
            } catch (err) {
                delete pendingDeletes[deleteId];
                showToast(err.message, 'error');
                // Refresh to restore item in UI
                if (refreshFn) refreshFn();
            }
        }
    }, 5000);
}

window.cancelDelete = function(deleteId) {
    const pending = pendingDeletes[deleteId];
    if (pending) {
        // Remove toast
        if (pending.toast) pending.toast.remove();
        delete pendingDeletes[deleteId];

        // Restore the row if we have the HTML saved
        if (pending.rowHTML && pending.rowParent) {
            // Create a temporary container to parse the HTML
            const temp = document.createElement('tbody');
            temp.innerHTML = pending.rowHTML;
            const restoredRow = temp.firstElementChild;

            // Insert the row back
            if (pending.rowNextSibling) {
                pending.rowParent.insertBefore(restoredRow, pending.rowNextSibling);
            } else {
                pending.rowParent.appendChild(restoredRow);
            }

            // Animate the restoration
            restoredRow.style.opacity = '0';
            restoredRow.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                restoredRow.style.opacity = '1';
            }, 10);
        } else {
            // Fallback: refresh UI to restore item
            if (pending.refreshFn) pending.refreshFn();
        }

        showToast(t('toast.deleteUndone') || 'Delete cancelled', 'success');
    }
};

// ============================================
// Mobile Menu Toggle
// ============================================
window.toggleMobileMenu = function() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar && overlay) {
        const isOpen = sidebar.classList.contains('open');

        if (isOpen) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        } else {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        }
    }
};

// ============================================
// Search & Filter Utilities
// ============================================

// Generic search function for tables
window.filterTable = function(searchValue, categoryValue, items, searchFields, categoryField) {
    let filtered = items;

    // Apply search filter
    if (searchValue) {
        const search = searchValue.toLowerCase();
        filtered = filtered.filter(item => {
            return searchFields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(search);
            });
        });
    }

    // Apply category filter
    if (categoryValue && categoryValue !== 'all') {
        filtered = filtered.filter(item => {
            return item[categoryField] === categoryValue;
        });
    }

    return filtered;
};

// Debounce helper for search inputs
window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

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

// Update cost display for a consumable row (uses custom unit price if entered)
window.updateConsumableCost = function(row) {
    const select = row.querySelector('[data-consumable-select]');
    const qtyInput = row.querySelector('[data-consumable-quantity]');
    const unitPriceInput = row.querySelector('[data-consumable-unit-price]');
    const costDisplay = row.querySelector('[data-consumable-cost]');
    if (!select || !qtyInput || !costDisplay) return;

    const consumableId = select.value;
    const quantity = parseFloat(qtyInput.value) || 0;

    if (consumableId && quantity > 0) {
        // Use custom unit price if entered, otherwise use calculated price
        let unitCost;
        if (unitPriceInput && unitPriceInput.value) {
            unitCost = parseFloat(unitPriceInput.value);
        } else {
            unitCost = window.getConsumableUnitCost(consumableId);
        }
        const totalCost = unitCost * quantity;
        costDisplay.textContent = formatCurrency(totalCost);
    } else {
        costDisplay.textContent = '-';
    }

    // Trigger live price preview update
    if (typeof window.updateLivePricePreview === 'function') {
        window.updateLivePricePreview();
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

// Global function to add consumable row with searchable dropdown (defined here so it's always available)
window.addConsumableRow = function(preselectedId = null, preselectedQty = 1, preselectedCustomPrice = null) {
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
        alert('Please add consumables & materials to your library first before adding them to services.');
        return;
    }

    const preselected = preselectedId ? consumables.find(c => c.id == preselectedId) : null;
    // Calculate default unit price from consumable
    const defaultUnitPrice = preselected ? (preselected.pack_cost / preselected.cases_per_pack / preselected.units_per_case) : null;
    const rowId = 'consumable-row-' + Date.now();

    const row = document.createElement('div');
    row.className = 'consumable-row';
    row.id = rowId;
    row.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center;';

    // Get localized name for preselected consumable
    const preselectedName = preselected ? (i18n.currentLang === 'ar' && preselected.name_ar ? preselected.name_ar : preselected.item_name) : '';

    // Use custom price if set, otherwise show default
    const displayUnitPrice = preselectedCustomPrice !== null ? preselectedCustomPrice : (defaultUnitPrice ? defaultUnitPrice.toFixed(2) : '');

    row.innerHTML = `
        <div class="consumable-search-wrapper" style="flex:2;position:relative;">
            <input type="text" class="form-input consumable-search"
                   placeholder="${t('services.searchConsumables')}" autocomplete="off"
                   value="${preselectedName}"
                   data-consumable-search readonly style="cursor:pointer;">
            <input type="hidden" data-consumable-select value="${preselectedId || ''}">
            <input type="hidden" data-consumable-default-price value="${defaultUnitPrice || ''}">
            <svg class="dropdown-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--gray-400);">
                <polyline points="6 9 12 15 18 9"/>
            </svg>
        </div>
        <input type="number" class="form-input" style="width:70px;" placeholder="${t('services.qty')}" value="${preselectedQty}" data-consumable-quantity min="0.1" step="0.1" required>
        <input type="number" class="form-input" style="width:90px;" placeholder="${t('services.unitPrice')}" value="${displayUnitPrice}" data-consumable-unit-price step="0.01" min="0">
        <span data-consumable-cost style="width:80px;text-align:right;font-weight:500;color:var(--gray-600);">-</span>
        <button type="button" class="btn btn-sm btn-ghost" onclick="this.parentElement.remove()" title="${t('common.delete')}">✕</button>
    `;

    // Set up searchable dropdown - create dropdown in body for proper positioning
    const searchInput = row.querySelector('[data-consumable-search]');
    const hiddenInput = row.querySelector('[data-consumable-select]');
    const qtyInput = row.querySelector('[data-consumable-quantity]');

    // Create dropdown element in document body
    const dropdown = document.createElement('div');
    dropdown.className = 'consumable-dropdown';
    dropdown.style.display = 'none';
    document.body.appendChild(dropdown);
    let highlightedIndex = -1;

    // Create dropdown structure once - search input stays, only options update
    dropdown.innerHTML = `
        <div class="dropdown-search-container" style="padding:0.5rem;border-bottom:1px solid var(--gray-200);position:sticky;top:0;background:white;z-index:1;">
            <input type="text" class="dropdown-search-input form-input" placeholder="${t('common.search')}"
                   style="width:100%;padding:0.5rem 0.75rem;font-size:0.875rem;">
        </div>
        <div class="dropdown-options-container"></div>
    `;

    const dropdownSearchInput = dropdown.querySelector('.dropdown-search-input');
    const optionsContainer = dropdown.querySelector('.dropdown-options-container');

    // Set up search input event listener once
    dropdownSearchInput.addEventListener('input', (e) => {
        e.stopPropagation();
        renderOptions(e.target.value);
    });
    dropdownSearchInput.addEventListener('click', (e) => e.stopPropagation());

    // Render dropdown options - only updates the options container, not the search input
    const renderOptions = (filter = '') => {
        const filterLower = filter.toLowerCase();
        const filtered = consumables.filter(c => {
            const itemName = c.item_name.toLowerCase();
            const nameAr = (c.name_ar || '').toLowerCase();
            return itemName.includes(filterLower) || nameAr.includes(filterLower);
        });

        if (filtered.length === 0) {
            optionsContainer.innerHTML = `<div style="padding:0.75rem 1rem;color:var(--gray-500);text-align:center;">${t('common.noData')}</div>`;
        } else {
            optionsContainer.innerHTML = filtered.map((c, idx) => {
                const unitCost = c.pack_cost / c.cases_per_pack / c.units_per_case;
                const displayName = i18n.currentLang === 'ar' && c.name_ar ? c.name_ar : c.item_name;
                return `<div class="consumable-option ${idx === highlightedIndex ? 'highlighted' : ''}"
                            data-id="${c.id}" data-name="${displayName}" data-index="${idx}">
                    <span>${displayName}</span>
                    <span style="font-size:0.75rem;color:var(--gray-500);">${formatCurrency(unitCost)}/${t('services.unit')}</span>
                </div>`;
            }).join('');
        }
        highlightedIndex = filtered.length > 0 ? 0 : -1;
        updateHighlight();
    };

    const updateHighlight = () => {
        dropdown.querySelectorAll('.consumable-option').forEach((opt, idx) => {
            opt.style.background = idx === highlightedIndex ? 'var(--primary-50)' : '';
        });
    };

    const selectOption = (id, name) => {
        hiddenInput.value = id;
        searchInput.value = name;
        dropdown.style.display = 'none';

        // Set default unit price when selecting a consumable
        const selectedConsumable = consumables.find(c => c.id == id);
        if (selectedConsumable) {
            const defaultPrice = selectedConsumable.pack_cost / selectedConsumable.cases_per_pack / selectedConsumable.units_per_case;
            const defaultPriceInput = row.querySelector('[data-consumable-default-price]');
            const unitPriceInput = row.querySelector('[data-consumable-unit-price]');
            if (defaultPriceInput) defaultPriceInput.value = defaultPrice;
            if (unitPriceInput) unitPriceInput.value = defaultPrice.toFixed(2);
        }

        window.updateConsumableCost(row);
    };

    // Position dropdown using fixed positioning to escape overflow
    const positionDropdown = () => {
        const rect = searchInput.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 200; // max-height from CSS
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        dropdown.style.position = 'fixed';
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.width = `${rect.width}px`;

        // Position above if not enough space below
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            dropdown.style.bottom = `${viewportHeight - rect.top + 2}px`;
            dropdown.style.top = 'auto';
        } else {
            dropdown.style.top = `${rect.bottom + 2}px`;
            dropdown.style.bottom = 'auto';
        }
    };

    // Event listeners - click to open dropdown (readonly input acts as dropdown trigger)
    const openDropdown = () => {
        dropdownSearchInput.value = '';  // Clear search
        renderOptions('');  // Show all options initially
        positionDropdown();
        dropdown.style.display = 'block';
        setTimeout(() => dropdownSearchInput.focus(), 0);  // Focus search input
    };

    searchInput.addEventListener('click', openDropdown);
    searchInput.addEventListener('focus', openDropdown);

    searchInput.addEventListener('keydown', (e) => {
        const options = dropdown.querySelectorAll('.consumable-option[data-id]');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, options.length - 1);
            updateHighlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, 0);
            updateHighlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && options[highlightedIndex]) {
                const opt = options[highlightedIndex];
                selectOption(opt.dataset.id, opt.dataset.name);
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });

    dropdown.addEventListener('click', (e) => {
        const opt = e.target.closest('.consumable-option[data-id]');
        if (opt) {
            selectOption(opt.dataset.id, opt.dataset.name);
        }
    });

    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
        if (!row.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    };
    document.addEventListener('click', handleClickOutside);

    // Close and reposition dropdown on scroll
    const handleScroll = (e) => {
        // If scrolling within modal content, reposition dropdown
        if (dropdown.style.display !== 'none') {
            positionDropdown();
            // Hide if input scrolled out of view
            const rect = searchInput.getBoundingClientRect();
            const modalContent = searchInput.closest('.modal-content');
            if (modalContent) {
                const modalRect = modalContent.getBoundingClientRect();
                if (rect.bottom < modalRect.top || rect.top > modalRect.bottom) {
                    dropdown.style.display = 'none';
                }
            }
        }
    };
    window.addEventListener('scroll', handleScroll, true);

    // Clean up event listeners and dropdown when row is removed
    const cleanup = () => {
        document.removeEventListener('click', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        if (dropdown.parentNode) {
            dropdown.remove();
        }
    };

    // Override the remove button to also cleanup dropdown
    const removeBtn = row.querySelector('.btn-ghost');
    if (removeBtn) {
        removeBtn.onclick = () => {
            cleanup();
            row.remove();
        };
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
                if (node === row || node.contains && node.contains(row)) {
                    cleanup();
                    observer.disconnect();
                }
            });
        });
    });
    if (row.parentNode) {
        observer.observe(row.parentNode, { childList: true });
    }

    // Also cleanup when modal is closed
    const modal = document.getElementById('modalOverlay');
    if (modal) {
        const modalObserver = new MutationObserver((mutations) => {
            if (!document.body.contains(row)) {
                cleanup();
                modalObserver.disconnect();
            }
        });
        modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
    }

    qtyInput.addEventListener('input', () => window.updateConsumableCost(row));

    // Add listener for unit price input
    const unitPriceInput = row.querySelector('[data-consumable-unit-price]');
    if (unitPriceInput) {
        unitPriceInput.addEventListener('input', () => window.updateConsumableCost(row));
    }

    // Insert at top instead of bottom
    container.insertBefore(row, container.firstChild);

    // Update cost if preselected
    if (preselectedId) {
        window.updateConsumableCost(row);
    }
};

// Global function to add equipment row
window.addEquipmentRow = function(preselectedId = null, preselectedHours = 0.25) {
    const container = document.getElementById('equipmentContainer');
    if (!container) {
        console.error('equipmentContainer not found');
        return;
    }

    // Remove "no equipment" message if it exists
    const emptyMsg = container.querySelector('.empty-equipment');
    if (emptyMsg) {
        emptyMsg.remove();
    }

    const equipmentList = window.serviceFormEquipment;
    if (!equipmentList || equipmentList.length === 0) {
        alert(t('services.noPerHourEquipment'));
        return;
    }

    const preselected = preselectedId ? equipmentList.find(e => e.id == preselectedId) : null;
    const rowId = 'equipment-row-' + Date.now();

    const row = document.createElement('div');
    row.className = 'equipment-row';
    row.id = rowId;
    row.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center;';

    row.innerHTML = `
        <select class="form-select" style="flex:2;" data-equipment-select>
            <option value="">${t('services.selectEquipment')}</option>
            ${equipmentList.map(e =>
                `<option value="${e.id}" ${preselectedId == e.id ? 'selected' : ''}>${e.asset_name}</option>`
            ).join('')}
        </select>
        <div class="input-with-unit" style="flex:1;">
            <input type="number" class="form-input" style="width:100%;" data-equipment-hours value="${preselectedHours}" step="0.1" min="0.1" placeholder="0.25">
            <span class="input-unit">${t('services.hours')}</span>
        </div>
        <button type="button" class="btn btn-sm btn-ghost" onclick="this.parentElement.remove()" title="${t('common.delete')}">✕</button>
    `;

    // Insert at top
    container.insertBefore(row, container.firstChild);
};

// Toggle doctor fee input fields based on fee type
window.toggleDoctorFeeInputs = function() {
    const feeType = document.getElementById('doctorFeeTypeSelect')?.value || 'hourly';
    const hourlyGroup = document.getElementById('doctorHourlyFeeGroup');
    const fixedGroup = document.getElementById('doctorFixedFeeGroup');
    const percentageGroup = document.getElementById('doctorPercentageGroup');

    if (hourlyGroup) hourlyGroup.style.display = feeType === 'hourly' ? 'block' : 'none';
    if (fixedGroup) fixedGroup.style.display = feeType === 'fixed' ? 'block' : 'none';
    if (percentageGroup) percentageGroup.style.display = feeType === 'percentage' ? 'block' : 'none';

    // Update required attribute
    const hourlyInput = hourlyGroup?.querySelector('input');
    const fixedInput = fixedGroup?.querySelector('input');
    const percentageInput = percentageGroup?.querySelector('input');

    if (hourlyInput) hourlyInput.required = feeType === 'hourly';
    if (fixedInput) fixedInput.required = feeType === 'fixed';
    if (percentageInput) percentageInput.required = feeType === 'percentage';
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
        // Initialize i18n first
        await i18n.init();

        this.user = await API.get('/api/user');
        this.settings = await API.get('/api/settings/global');
        this.subscription = this.user.subscription || {};
        document.getElementById('userName').textContent = this.user.name;

        // Show super admin nav if user is super admin
        if (this.user.is_super_admin) {
            document.getElementById('superAdminSection').style.display = 'block';
            document.getElementById('superAdminLink').style.display = 'flex';
        }

        // Store subscription info
        this.subscription = this.user.subscription;

        // Set language from user preference if available
        if (this.user.language && this.user.language !== i18n.currentLang) {
            await i18n.setLanguage(this.user.language, false);
        }

        // Update navigation text based on language
        this.updateNavigationText();

        // Setup HTML5 History API routing
        this.setupRouting();

        // Load page from URL path or default to dashboard
        const path = window.location.pathname.slice(1); // Remove leading /
        const page = path || 'dashboard';
        this.loadPage(page, null, false); // false = don't update URL since we're reading from it
    },

    setupRouting() {
        // Listen for browser back/forward buttons (popstate event)
        window.addEventListener('popstate', (event) => {
            const path = window.location.pathname.slice(1);
            const page = path || 'dashboard';
            if (page !== this.currentPage) {
                this.loadPage(page, null, false); // false = don't push state to avoid loop
            }
        });
    },

    updateNavigationText() {
        // Update navigation labels with translations
        const navItems = {
            'dashboardLink': 'nav.dashboard',
            'settingsLink': 'nav.settings',
            'consumablesLink': 'nav.consumables',
            'servicesLink': 'nav.services',
            'priceListLink': 'nav.priceList',
            'subscriptionLink': 'nav.subscription',
            'superAdminLink': 'nav.manageClinics'
        };

        for (const [id, key] of Object.entries(navItems)) {
            const el = document.getElementById(id);
            if (el) {
                const textSpan = el.querySelector('.nav-text');
                if (textSpan) {
                    textSpan.textContent = t(key);
                }
            }
        }

        // Update section headers
        const sections = {
            'overviewSection': 'nav.overview',
            'configSection': 'nav.configuration',
            'servicesPricingSection': 'nav.servicesPricing',
            'accountSection': 'nav.account',
            'superAdminSection': 'nav.superAdmin'
        };

        for (const [id, key] of Object.entries(sections)) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = t(key);
            }
        }

        // Update logout text
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            const textSpan = logoutBtn.querySelector('.nav-text');
            if (textSpan) {
                textSpan.textContent = t('nav.logout');
            }
        }
    },

    async loadPage(page, scrollToSection = null, updateURL = true) {
        this.currentPage = page;
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[onclick="APP.loadPage('${page}')"]`)?.classList.add('active');

        // Update URL using HTML5 History API if requested (default: true)
        if (updateURL) {
            const url = page === 'dashboard' ? '/' : `/${page}`;
            if (window.location.pathname !== url) {
                history.pushState({ page }, '', url);
            }
        }

        const content = document.getElementById('pageContent');

        // Show appropriate skeleton based on page type
        const skeletonType = page === 'dashboard' ? 'dashboard' :
                            (page === 'price-list' ? 'table' : 'table');
        content.innerHTML = getSkeletonHTML(skeletonType);

        // Convert kebab-case to camelCase for Pages object
        const pageKey = page.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const html = await Pages[pageKey]();
        content.innerHTML = html;

        // Re-update navigation text (in case language changed)
        this.updateNavigationText();

        // Scroll to section if specified
        if (scrollToSection) {
            setTimeout(() => {
                const section = document.getElementById(scrollToSection);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }
};

const Pages = {
    async dashboard() {
        const stats = await API.get('/api/dashboard/stats');

        // Check subscription status - show limited dashboard for trial/expired/suspended users
        const restrictedLevels = ['trial', 'lockout', 'readonly'];
        const isRestricted = APP.subscription && restrictedLevels.includes(APP.subscription.restriction_level);
        const isSuspended = APP.subscription && APP.subscription.is_suspended;
        const isExpired = APP.subscription && (APP.subscription.restriction_level === 'lockout' || APP.subscription.restriction_level === 'readonly');
        const isTrial = APP.subscription && APP.subscription.restriction_level === 'trial';

        let priceList = [];
        let underpriced = 0;
        let optimal = 0;
        let potentialRevenue = 0;
        let topServices = [];

        if (!isRestricted) {
            priceList = await API.get('/api/price-list');
            topServices = priceList.slice(0, 5);

            // Calculate pricing health metrics
            underpriced = priceList.filter(s => s.current_price && s.current_price < s.rounded_price * 0.95).length;
            optimal = priceList.filter(s => !s.current_price || (s.current_price >= s.rounded_price * 0.95 && s.current_price <= s.rounded_price * 1.05)).length;
            potentialRevenue = priceList.reduce((sum, s) => {
                if (s.current_price && s.current_price < s.rounded_price) {
                    return sum + (s.rounded_price - s.current_price);
                }
                return sum;
            }, 0);
        }

        // Subscription banner for restricted users (trial, expired, or suspended)
        const trialDaysLeft = APP.subscription ? APP.subscription.trial_days_remaining : 0;
        let bannerTitle, bannerMessage, bannerButtonText, bannerIcon;

        if (isSuspended) {
            bannerTitle = t('subscription.accountOnHold');
            bannerMessage = t('subscription.onHoldMessage');
            bannerButtonText = t('subscription.getHelp');
            bannerIcon = '⏸️';
        } else if (isExpired) {
            bannerTitle = t('subscription.timeToRenew');
            bannerMessage = t('subscription.renewMessage');
            bannerButtonText = t('subscription.renewNow');
            bannerIcon = '🔄';
        } else {
            const trialText = trialDaysLeft > 0 ? ` ${t('subscription.trialDaysLeft', {days: trialDaysLeft})}` : '';
            bannerTitle = t('subscription.welcomeTrial');
            bannerMessage = `${t('subscription.trialMessage')}${trialText} ${t('subscription.upgradeAnytime')}`;
            bannerButtonText = t('subscription.seePlans');
            bannerIcon = '✨';
        }

        const subscriptionBanner = isRestricted ? `
            <div class="subscription-banner ${(isExpired || isSuspended) ? 'subscription-banner-expired' : ''}">
                <div class="subscription-banner-icon">
                    <span style="font-size: 1.5rem;">${bannerIcon}</span>
                </div>
                <div class="subscription-banner-content">
                    <h4>${bannerTitle}</h4>
                    <p>${bannerMessage}</p>
                </div>
                <button class="btn btn-primary" onclick="APP.loadPage('subscription')">${bannerButtonText}</button>
            </div>
        ` : '';

        return `
            ${subscriptionBanner}
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: var(--primary-100); color: var(--primary-600);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                                <rect x="9" y="3" width="6" height="4" rx="1"/>
                            </svg>
                        </span>
                        <span class="metric-label">${t('dashboard.totalServices')}</span>
                    </div>
                    <div class="metric-value">${stats.total_services}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('dashboard.activeProcedures')}</span>
                    </div>
                </div>

                ${isRestricted ? `
                <div class="metric-card metric-locked">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: var(--gray-100); color: var(--gray-400);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </span>
                        <span class="metric-label">${t('dashboard.pricingHealth')}</span>
                    </div>
                    <div class="metric-value" style="color: var(--gray-400);">${t('dashboard.locked')}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${isExpired ? t('dashboard.renewToUnlock') : t('dashboard.subscribeToUnlock')}</span>
                    </div>
                </div>
                ` : underpriced > 0 ? `
                <div class="metric-card metric-highlight">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #fef3c7; color: var(--warning);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 22h20L12 2zm0 15a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-1-2V9h2v6h-2z"/>
                            </svg>
                        </span>
                        <span class="metric-label">${t('dashboard.needsAttention')}</span>
                    </div>
                    <div class="metric-value">${underpriced}</div>
                    <div class="metric-footer">
                        <span class="metric-action" onclick="APP.loadPage('price-list')">${t('dashboard.servicesUnderpriced')} →</span>
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
                        <span class="metric-label">${t('dashboard.pricingHealth')}</span>
                    </div>
                    <div class="metric-value" style="color: var(--success);">${t('dashboard.good')}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('dashboard.allProperlyPriced')}</span>
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
                        <span class="metric-label">${t('dashboard.chairHourlyRate')}</span>
                    </div>
                    <div class="metric-value currency">${formatCurrency(stats.chair_hourly_rate)}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('dashboard.effectiveHoursMonth', {hours: stats.effective_hours.toFixed(0)})}</span>
                    </div>
                </div>

                <div class="metric-card metric-card-wide">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #fce7f3; color: #db2777;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="1" x2="12" y2="23"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </span>
                        <span class="metric-label">${t('dashboard.monthlyFixedCosts')}</span>
                    </div>
                    <div class="metric-value currency">${formatCurrency(stats.total_fixed_monthly)}</div>
                    <div class="metric-breakdown">
                        <div class="breakdown-item">
                            <span class="breakdown-label">${t('dashboard.fixedCosts')}</span>
                            <span class="breakdown-value">${formatCurrency(stats.fixed_costs)}</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">${t('dashboard.staffSalaries')}</span>
                            <span class="breakdown-value">${formatCurrency(stats.staff_salaries)}</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">${t('dashboard.equipmentDepreciation')}</span>
                            <span class="breakdown-value">${formatCurrency(stats.equipment_depreciation)}</span>
                        </div>
                    </div>
                    <div class="metric-footer">
                        <span class="metric-action" onclick="APP.loadPage('settings')">${t('common.viewDetails')} →</span>
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
                        ${t('dashboard.quickStartGuide')}
                    </h3>
                </div>
                <div class="card-body">
                    <p style="color:var(--gray-700);margin-bottom:1.5rem;">
                        ${t('dashboard.quickStartIntro')}
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
                            <h4>${t('dashboard.step1Title')}</h4>
                            <p>${t('dashboard.step1Desc')}</p>
                        </div>
                        <div class="setup-step" onclick="APP.loadPage('consumables')">
                            <div class="step-number">2</div>
                            <div class="step-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                                </svg>
                            </div>
                            <h4>${t('dashboard.step2Title')}</h4>
                            <p>${t('dashboard.step2Desc')}</p>
                        </div>
                        <div class="setup-step" onclick="APP.loadPage('services')">
                            <div class="step-number">3</div>
                            <div class="step-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M12 2C8 2 6 5 6 8c0 2.5 1 4 2 5.5S10 16 10 18c0 1.5-.5 3-1.5 4h7c-1-1-1.5-2.5-1.5-4 0-2 1-3.5 2-5.5s2-3 2-5.5c0-3-2-6-6-6z"/>
                                    <path d="M9 22h6"/>
                                </svg>
                            </div>
                            <h4>${t('dashboard.step3Title')}</h4>
                            <p>${t('dashboard.step3Desc')}</p>
                        </div>
                    </div>
                </div>
            </div>

            ${topServices.length > 0 ? `
            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">${t('dashboard.recentServices')}</h3>
                    <button class="btn btn-sm btn-primary" onclick="APP.loadPage('price-list')">${t('common.viewAll')} →</button>
                </div>
                <div class="card-body" style="padding:0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>${t('dashboard.service')}</th>
                                <th>${t('dashboard.cost')}</th>
                                <th>${t('dashboard.finalPrice')}</th>
                                <th>${t('dashboard.margin')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topServices.map(s => `
                                <tr>
                                    <td><strong>${getLocalizedName(s, 'service_name', 'service_name_ar')}</strong></td>
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
                    <h3 class="card-title">💡 ${t('settings.howPricingWorks')}</h3>
                </div>
                <div class="card-body">
                    <p style="margin-bottom:0.75rem;"><strong>${t('settings.pricingSteps')}</strong></p>
                    <ol style="margin-left:1.25rem;line-height:1.8;">
                        <li>${t('settings.step1')}</li>
                        <li>${t('settings.step2')}</li>
                        <li>${t('settings.step3')}</li>
                        <li>${t('settings.step4')}</li>
                    </ol>
                    <p style="margin-top:0.75rem;color:var(--gray-700);"><em>${t('settings.pricingNote')}</em></p>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">${t('settings.globalSettings')}</h3>
                </div>
                <div class="card-body">
                    <form id="globalSettingsForm" class="form-row">
                        <div class="form-group">
                            <label class="form-label">${t('settings.currency')}</label>
                            <select class="form-select" name="currency">
                                <option value="EGP" ${settings.currency==='EGP'?'selected':''}>${t('currency.EGP')}</option>
                                <option value="USD" ${settings.currency==='USD'?'selected':''}>${t('currency.USD')}</option>
                                <option value="EUR" ${settings.currency==='EUR'?'selected':''}>${t('currency.EUR')}</option>
                            </select>
                            <small style="color:var(--gray-600);">${t('settings.currencyHelp')}</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">${t('settings.vatPercent')}</label>
                            <input type="number" class="form-input" name="vat_percent" value="${settings.vat_percent}" step="0.1" min="0" max="100" placeholder="e.g., 14">
                            <small style="color:var(--gray-600);">${t('settings.vatHelp')}</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">${t('settings.defaultProfit')}</label>
                            <input type="number" class="form-input" name="default_profit_percent" value="${settings.default_profit_percent}" step="1" min="0" max="200" placeholder="e.g., 40">
                            <small style="color:var(--gray-600);">${t('settings.defaultProfitHelp')}</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">${t('settings.roundingNearest')}</label>
                            <select class="form-select" name="rounding_nearest">
                                ${[1,5,10,50,100].map(v => `<option value="${v}" ${settings.rounding_nearest===v?'selected':''}>${t('settings.nearest')} ${v}</option>`).join('')}
                            </select>
                            <small style="color:var(--gray-600);">${t('settings.roundingHelp')}</small>
                        </div>
                    </form>
                    <div style="margin-top:1rem;">
                        <button class="btn btn-primary" onclick="Pages.saveGlobalSettings()">${t('settings.saveSettings')}</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">${t('settings.clinicCapacity')}</h3>
                </div>
                <div class="card-body">
                    <form id="capacityForm" class="form-row">
                        <div class="form-group">
                            <label class="form-label">${t('settings.dentalChairs')}</label>
                            <input type="number" class="form-input" name="chairs" value="${capacity.chairs}" min="1" placeholder="e.g., 3">
                            <small style="color:var(--gray-600);">${t('settings.chairsHelp')}</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">${t('settings.workingDays')}</label>
                            <input type="number" class="form-input" name="days_per_month" value="${capacity.days_per_month}" min="1" placeholder="e.g., 24">
                            <small style="color:var(--gray-600);">${t('settings.workingDaysHelp')}</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">${t('settings.workingHours')}</label>
                            <input type="number" class="form-input" name="hours_per_day" value="${capacity.hours_per_day}" min="1" step="0.5" placeholder="e.g., 8">
                            <small style="color:var(--gray-600);">${t('settings.workingHoursHelp')}</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">${t('settings.utilizationRate')} ${tooltip(t('settings.utilizationHelp'))}</label>
                            <input type="number" class="form-input" name="utilization_percent" value="${capacity.utilization_percent}" min="1" max="100" placeholder="e.g., 80">
                        </div>
                    </form>
                    <div style="margin-top:1rem;">
                        <button class="btn btn-primary" onclick="Pages.saveCapacity()">${t('settings.saveCapacity')}</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;" id="section-fixed-costs">
                <div class="card-header">
                    <h3 class="card-title">${t('settings.fixedMonthlyCosts')}</h3>
                    <button class="btn btn-sm btn-primary" onclick="Pages.showFixedCostForm()">+ ${t('settings.addCost')}</button>
                </div>
                <div class="card-body" style="padding:0;">
                    ${fixedCosts.length > 0 ? `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>${t('settings.costName')}</th>
                                <th>${t('settings.monthlyAmount')}</th>
                                <th>${t('settings.includeInCalculations')}</th>
                                <th>${t('settings.notes')}</th>
                                <th>${t('common.actions')}</th>
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
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.showFixedCostForm(${c.id})" title="${t('common.edit')}">✎</button>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.deleteFixedCost(${c.id})" title="${t('common.delete')}">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">💰</div>
                            <h3>No fixed costs yet</h3>
                            <p>Add rent, utilities, and other monthly expenses to calculate accurate service pricing.</p>
                            <div class="empty-state-actions">
                                <button class="btn btn-primary" onclick="Pages.showFixedCostForm()">
                                    + ${t('settings.addCost')}
                                </button>
                            </div>
                        </div>
                    `}
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;" id="section-salaries">
                <div class="card-header">
                    <h3 class="card-title">${t('settings.salaries')}</h3>
                    <button class="btn btn-sm btn-primary" onclick="Pages.showSalaryForm()">+ ${t('settings.addSalary')}</button>
                </div>
                <div class="card-body" style="padding:0;">
                    ${salaries.length > 0 ? `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>${t('settings.role')}</th>
                                <th>${t('settings.monthlySalary')}</th>
                                <th>${t('settings.includeInCalculations')}</th>
                                <th>${t('settings.notes')}</th>
                                <th>${t('common.actions')}</th>
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
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.showSalaryForm(${s.id})" title="${t('common.edit')}">✎</button>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.deleteSalary(${s.id})" title="${t('common.delete')}">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">👥</div>
                            <h3>No salaries yet</h3>
                            <p>Add staff salaries to include labor costs in your service pricing calculations.</p>
                            <div class="empty-state-actions">
                                <button class="btn btn-primary" onclick="Pages.showSalaryForm()">
                                    + ${t('settings.addSalary')}
                                </button>
                            </div>
                        </div>
                    `}
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;" id="section-depreciation">
                <div class="card-header">
                    <h3 class="card-title">${t('settings.depreciation')}</h3>
                    <button class="btn btn-sm btn-primary" onclick="Pages.showEquipmentForm()">+ ${t('settings.addEquipment')}</button>
                </div>
                <div class="card-body" style="padding:0;">
                    ${equipment.length > 0 ? `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>${t('settings.equipmentName')}</th>
                                <th>${t('settings.purchaseCost')}</th>
                                <th>${t('settings.lifeYears')}</th>
                                <th>${t('settings.allocation')}</th>
                                <th>${t('settings.monthlyUsageHours')}</th>
                                <th>${t('common.actions')}</th>
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
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.showEquipmentForm(${e.id})" title="${t('common.edit')}">✎</button>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.deleteEquipment(${e.id})" title="${t('common.delete')}">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">🔧</div>
                            <h3>No equipment yet</h3>
                            <p>Add dental equipment to track depreciation and include costs in service pricing.</p>
                            <div class="empty-state-actions">
                                <button class="btn btn-primary" onclick="Pages.showEquipmentForm()">
                                    + ${t('settings.addEquipment')}
                                </button>
                            </div>
                        </div>
                    `}
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
            showToast(t('toast.settingsSaved'));
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
            showToast(t('toast.capacitySaved'));
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
                    <label class="form-label">${t('settings.costCategory')}</label>
                    <input type="text" class="form-input" name="category" value="${cost?.category||''}" placeholder="e.g., Rent, Electricity, Internet" required>
                    <small style="color:var(--gray-600);">${t('settings.costCategoryHelp')}</small>
                </div>
                <div class="form-group">
                    <label class="form-label">${t('settings.monthlyAmount')}</label>
                    <input type="number" class="form-input" name="monthly_amount" value="${cost?.monthly_amount||''}" step="0.01" placeholder="e.g., 5000" required>
                    <small style="color:var(--gray-600);">${t('settings.monthlyAmountHelp')}</small>
                </div>
                <div class="form-group">
                    <label class="form-label">${t('settings.includeInPricing')}</label>
                    <select class="form-select" name="included">
                        <option value="1" ${cost?.included?'selected':''}>${t('settings.includeYes')}</option>
                        <option value="0" ${!cost?.included?'selected':''}>${t('settings.includeNo')}</option>
                    </select>
                    <small style="color:var(--gray-600);">${t('settings.includeHelp')}</small>
                </div>
                <div class="form-group">
                    <label class="form-label">${t('settings.notesOptional')}</label>
                    <input type="text" class="form-input" name="notes" value="${cost?.notes||''}">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">${t('common.cancel')}</button>
                    <button type="submit" class="btn btn-primary">${t('common.save')}</button>
                </div>
            </form>
        `;

        openModal(id ? t('modal.editFixedCost') : t('modal.addFixedCost'), content);

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
                showToast(t('toast.fixedCostSaved'));
                closeAllModals();
                APP.loadPage('settings', 'section-fixed-costs');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    async deleteFixedCost(id) {
        if (confirm(t('modal.deleteMessage'))) {
            try {
                await API.delete(`/api/fixed-costs/${id}`);
                showToast(t('toast.fixedCostDeleted'));
                APP.loadPage('settings', 'section-fixed-costs');
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
                    <label class="form-label">${t('settings.roleOrName')}</label>
                    <input type="text" class="form-input" name="role_name" value="${salary?.role_name||''}" placeholder="e.g., Receptionist, Dental Assistant" required>
                    <small style="color:var(--gray-600);">${t('settings.roleHelp')}</small>
                </div>
                <div class="form-group">
                    <label class="form-label">${t('settings.monthlySalary')}</label>
                    <input type="number" class="form-input" name="monthly_salary" value="${salary?.monthly_salary||''}" step="0.01" placeholder="e.g., 3000" required>
                    <small style="color:var(--gray-600);">${t('settings.salaryHelp')}</small>
                </div>
                <div class="form-group">
                    <label class="form-label">${t('settings.includeInPricing')}</label>
                    <select class="form-select" name="included">
                        <option value="1" ${salary?.included?'selected':''}>${t('settings.includeYes')}</option>
                        <option value="0" ${!salary?.included?'selected':''}>${t('settings.includeNo')}</option>
                    </select>
                    <small style="color:var(--gray-600);">${t('settings.includeHelp')}</small>
                </div>
                <div class="form-group">
                    <label class="form-label">${t('settings.notes')}</label>
                    <input type="text" class="form-input" name="notes" value="${salary?.notes||''}">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">${t('common.cancel')}</button>
                    <button type="submit" class="btn btn-primary">${t('common.save')}</button>
                </div>
            </form>
        `;

        openModal(id ? t('modal.editSalary') : t('modal.addSalary'), content);

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
                showToast(t('toast.salarySaved'));
                closeAllModals();
                APP.loadPage('settings', 'section-salaries');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    async deleteSalary(id) {
        if (confirm(t('modal.deleteMessage'))) {
            try {
                await API.delete(`/api/salaries/${id}`);
                showToast(t('toast.salaryDeleted'));
                APP.loadPage('settings', 'section-salaries');
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
                    <label class="form-label">${t('settings.equipmentName')}</label>
                    <input type="text" class="form-input" name="asset_name" value="${equipment?.asset_name||''}" placeholder="e.g., X-Ray Machine, Dental Chair" required>
                    <small style="color:var(--gray-600);">${t('settings.equipmentNameHelp')}</small>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">${t('settings.purchaseCost')}</label>
                        <input type="number" class="form-input" name="purchase_cost" value="${equipment?.purchase_cost||''}" step="0.01" placeholder="e.g., 50000" required>
                        <small style="color:var(--gray-600);">${t('settings.purchaseCostHelp')}</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('settings.lifeYears')}</label>
                        <input type="number" class="form-input" name="life_years" value="${equipment?.life_years||10}" min="1" placeholder="e.g., 10" required>
                        <small style="color:var(--gray-600);">${t('settings.lifeYearsHelp')}</small>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">${t('settings.allocationMethod')}</label>
                        <select class="form-select" name="allocation_type" id="allocationType" onchange="toggleUsageHours()" required>
                            <option value="fixed" ${equipment?.allocation_type==='fixed'?'selected':''}>${t('settings.allocationFixed')}</option>
                            <option value="per-hour" ${equipment?.allocation_type==='per-hour'?'selected':''}>${t('settings.allocationPerHour')}</option>
                        </select>
                        <small style="color:var(--gray-600);">${t('settings.allocationHelp')}</small>
                    </div>
                    <div class="form-group" id="usageHoursGroup" style="display:${equipment?.allocation_type==='per-hour'?'block':'none'}">
                        <label class="form-label">${t('settings.monthlyUsageHours')}</label>
                        <input type="number" class="form-input" name="monthly_usage_hours" value="${equipment?.monthly_usage_hours||''}" step="0.1" placeholder="e.g., 20">
                        <small style="color:var(--gray-600);">${t('settings.monthlyUsageHelp')}</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">${t('common.cancel')}</button>
                    <button type="submit" class="btn btn-primary">${t('common.save')}</button>
                </div>
            </form>
            <script>
                function toggleUsageHours() {
                    const type = document.getElementById('allocationType').value;
                    document.getElementById('usageHoursGroup').style.display = type === 'per-hour' ? 'block' : 'none';
                }
            </script>
        `;

        openModal(id ? t('modal.editEquipment') : t('modal.addEquipment'), content);

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
                showToast(t('toast.equipmentSaved'));
                closeAllModals();
                APP.loadPage('settings', 'section-depreciation');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    async deleteEquipment(id) {
        if (confirm(t('modal.deleteMessage'))) {
            try {
                await API.delete(`/api/equipment/${id}`);
                showToast(t('toast.equipmentDeleted'));
                APP.loadPage('settings', 'section-depreciation');
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
                    <h3 class="card-title">📦 ${t('consumables.aboutTitle')}</h3>
                </div>
                <div class="card-body">
                    <p><strong>${t('consumables.aboutDescription')}</strong></p>
                    <p style="margin-top:0.5rem;margin-bottom:0.5rem;">${t('consumables.aboutExamples')}</p>
                    <p style="margin-bottom:0;color:var(--gray-700);">
                        <strong>${t('consumables.howItWorks')}</strong> ${t('consumables.howItWorksDesc')}
                    </p>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">${t('consumables.library')}</h3>
                    <button class="btn btn-primary" onclick="Pages.showConsumableForm()">+ ${t('consumables.addConsumable')}</button>
                </div>
                <div class="card-body" style="padding:0;">
                    ${consumables.length > 0 ? `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>${t('consumables.itemName')}</th>
                                    <th>${t('consumables.packCost')}</th>
                                    <th>${t('consumables.casesPerPack')}</th>
                                    <th>${t('consumables.unitsPerCase')}</th>
                                    <th>${t('consumables.perUnitCost')}</th>
                                    <th>${t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${consumables.map(c => {
                                    const perUnitCost = c.pack_cost / c.cases_per_pack / c.units_per_case;
                                    return `
                                        <tr data-consumable-id="${c.id}">
                                            <td><strong>${getLocalizedName(c, 'item_name', 'name_ar')}</strong></td>
                                            <td>${formatCurrency(c.pack_cost)}</td>
                                            <td>${c.cases_per_pack}</td>
                                            <td>${c.units_per_case}</td>
                                            <td><strong>${formatCurrency(perUnitCost)}</strong></td>
                                            <td>
                                                <button class="btn btn-sm btn-ghost" onclick="Pages.showConsumableForm(${c.id})" title="${t('common.edit')}">✎</button>
                                                <button class="btn btn-sm btn-ghost" onclick="Pages.deleteConsumable(${c.id})" title="${t('common.delete')}">🗑️</button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">📦</div>
                            <h3>${t('consumables.noConsumables')}</h3>
                            <p>${t('consumables.addFirst')}</p>
                            <div class="empty-state-actions">
                                <button class="btn btn-primary" onclick="Pages.showConsumableForm()">
                                    + ${t('consumables.addConsumable')}
                                </button>
                            </div>
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
                    <label class="form-label required">${t('consumables.name')}</label>
                    <input type="text" class="form-input" name="item_name" value="${consumable?.item_name||''}" placeholder="e.g., Latex Gloves, Anesthetic Cartridge" required>
                </div>
                <div class="form-group">
                    <label class="form-label">${t('consumables.nameArabic')}</label>
                    <input type="text" class="form-input" name="name_ar" value="${consumable?.name_ar||''}" dir="rtl" placeholder="اسم المستهلك بالعربية" style="font-family: 'Noto Sans Arabic', var(--font-sans);">
                </div>

                <!-- Packaging Calculator with Visual Flow -->
                <div class="packaging-calculator">
                    <div class="packaging-header">
                        <span class="packaging-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -3px; margin-right: 0.5rem;">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            </svg>
                            ${t('consumables.packagingBreakdown')}
                        </span>
                        <span class="packaging-help">${t('consumables.packagingQuestion')}</span>
                    </div>

                    <div class="packaging-flow">
                        <!-- Step 1: Pack Cost -->
                        <div class="packaging-step">
                            <div class="step-badge">1</div>
                            <div class="step-content">
                                <label class="form-label required">${t('consumables.packCostLabel')}</label>
                                <div class="input-with-unit">
                                    <input type="number" class="form-input" name="pack_cost" id="packCostInput" value="${consumable?.pack_cost||''}" step="0.01" placeholder="e.g., 180" required oninput="window.updatePackagingPreview()">
                                    <span class="input-unit">${APP.settings?.currency || 'EGP'}</span>
                                </div>
                                <small>${t('consumables.packCostHelp')}</small>
                            </div>
                            <div class="step-visual">
                                <div class="visual-box">📦 1 ${t('consumables.pack')}</div>
                            </div>
                        </div>

                        <div class="packaging-arrow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M19 12l-7 7-7-7"/>
                            </svg>
                            <span>${t('consumables.contains')}</span>
                        </div>

                        <!-- Step 2: Cases per Pack -->
                        <div class="packaging-step">
                            <div class="step-badge">2</div>
                            <div class="step-content">
                                <label class="form-label required">${t('consumables.casesPerPack')}</label>
                                <input type="number" class="form-input" name="cases_per_pack" id="casesInput" value="${consumable?.cases_per_pack||1}" min="1" placeholder="e.g., 10" required oninput="window.updatePackagingPreview()">
                                <small>${t('consumables.casesPerPackHelp')}</small>
                            </div>
                            <div class="step-visual">
                                <div class="visual-box">📦 × <span id="casesPreview">${consumable?.cases_per_pack||1}</span></div>
                            </div>
                        </div>

                        <div class="packaging-arrow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M19 12l-7 7-7-7"/>
                            </svg>
                            <span>${t('consumables.eachContains')}</span>
                        </div>

                        <!-- Step 3: Units per Case -->
                        <div class="packaging-step">
                            <div class="step-badge">3</div>
                            <div class="step-content">
                                <label class="form-label required">${t('consumables.unitsPerCase')}</label>
                                <input type="number" class="form-input" name="units_per_case" id="unitsInput" value="${consumable?.units_per_case||1}" min="1" placeholder="e.g., 100" required oninput="window.updatePackagingPreview()">
                                <small>${t('consumables.unitsPerCaseHelp')}</small>
                            </div>
                            <div class="step-visual">
                                <div class="visual-box">🧤 × <span id="unitsPreview">${consumable?.units_per_case||1}</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- Live Calculation Result -->
                    <div class="packaging-result">
                        <div class="result-equation">
                            <span class="eq-part">${APP.settings?.currency || 'EGP'} <span id="packCostResult">${consumable?.pack_cost||0}</span></span>
                            <span class="eq-operator">÷</span>
                            <span class="eq-part"><span id="totalUnitsResult">${(consumable?.cases_per_pack||1) * (consumable?.units_per_case||1)}</span> ${t('consumables.units')}</span>
                            <span class="eq-operator">=</span>
                            <span class="eq-final">
                                <strong>${APP.settings?.currency || 'EGP'} <span id="unitCostResult">${consumable ? (consumable.pack_cost / consumable.cases_per_pack / consumable.units_per_case).toFixed(3) : '0.000'}</span></strong>
                                <small>${t('consumables.perUnit')}</small>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">${t('common.cancel')}</button>
                    <button type="submit" class="btn btn-primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:0.25rem;">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        ${t('consumables.saveConsumable')}
                    </button>
                </div>
            </form>
        `;

        openModal(id ? t('modal.editConsumable') : t('modal.addConsumable'), content);

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
                showToast(t('toast.consumableSaved'));
                closeAllModals();
                APP.loadPage('consumables');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    async deleteConsumable(id) {
        deleteWithUndo(
            'consumable',
            id,
            async (itemId) => await API.delete(`/api/consumables/${itemId}`),
            () => APP.loadPage('consumables')
        );
    },

    async services() {
        // Check subscription status first
        const sub = APP.subscription || {};
        const isSuspended = sub.is_suspended === true;
        const isTrial = sub.restriction_level === 'trial';
        const trialDaysLeft = sub.trial_days_remaining || 0;
        const trialEnded = sub.trial_ended === true;
        const isExpiredOrGracePeriod = sub.restriction_level === 'lockout' || sub.restriction_level === 'readonly';

        // LOCKOUT RULES (same as priceList):
        // 1. Suspended (inactive) = full lockout - show subscription wall
        // 2. Trial ended (7 days passed) = full lockout - show subscription wall
        // 3. Subscription expired/grace period = full lockout - show subscription wall
        const isFullLockout = isSuspended || trialEnded || isExpiredOrGracePeriod;

        // Show subscription wall for full lockout (same as priceList)
        if (isFullLockout) {
            let title, description, iconStyle;

            if (isSuspended) {
                title = t('subscription.accountOnHold');
                description = t('subscription.onHoldMessage');
                iconStyle = 'background: linear-gradient(135deg, #fef2f2, #fee2e2); color: var(--danger);';
            } else if (trialEnded) {
                title = t('subscription.trialEnded');
                description = t('subscription.trialEndedMessage');
                iconStyle = 'background: linear-gradient(135deg, #fef2f2, #fee2e2); color: var(--danger);';
            } else {
                title = t('subscription.timeToRenew');
                description = t('subscription.renewMessage');
                iconStyle = 'background: linear-gradient(135deg, #fef2f2, #fee2e2); color: var(--danger);';
            }

            return `
                <div class="subscription-wall">
                    <div class="subscription-wall-content">
                        <div class="subscription-icon" style="${iconStyle}">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                <circle cx="12" cy="16" r="1"/>
                            </svg>
                        </div>
                        <h2>${title}</h2>
                        <p class="subscription-description">${description}</p>

                        <div class="subscription-plan-card">
                            <div class="plan-header">
                                <h3>${t('subscription.dentalPricingPro')}</h3>
                                <span class="plan-badge">${t('subscription.fullAccess')}</span>
                            </div>
                            <ul class="plan-features">
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    ${t('subscription.unlimitedServices')}
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    ${t('subscription.fullPriceCalculations')}
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    ${t('subscription.priceListExport')}
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    ${t('subscription.smartInsights')}
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    ${t('subscription.prioritySupport')}
                                </li>
                            </ul>
                        </div>

                        <div class="subscription-contact">
                            <p>${t('subscription.readyToUpgrade')}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Not locked out - fetch services and show the page
        const services = await API.get('/api/services');
        const servicesUsed = sub.services_used || services.length;
        const maxTrialServices = sub.max_trial_services || 2;

        // Trial limit reached (can still view, but can't add more)
        const trialLimitReached = isTrial && servicesUsed >= maxTrialServices;

        // Can add services only if not in trial OR trial limit not reached
        const canAddService = !trialLimitReached;

        // Determine which banner to show (only for active trial)
        let bannerHtml = '';

        if (isTrial) {
            // Active trial
            bannerHtml = `
                <div class="restriction-banner ${trialLimitReached ? 'restriction-banner-warning' : 'restriction-banner-info'}">
                    <div class="restriction-banner-icon">${trialLimitReached ? '⚠️' : '🎁'}</div>
                    <div class="restriction-banner-content">
                        <h4>${t('services.trialFree')}${trialLimitReached ? ' - ' + t('services.trialLimitReached') : ''}</h4>
                        <p>${trialLimitReached
                            ? t('services.trialUsedAll', {max: maxTrialServices})
                            : t('services.trialRemaining', {max: maxTrialServices, days: trialDaysLeft, used: servicesUsed})}</p>
                    </div>
                    ${trialLimitReached ? `<button class="btn btn-primary" onclick="APP.loadPage('subscription')">${t('services.upgradeNow')}</button>` : ''}
                </div>
            `;
        }

        // Determine disabled button tooltip
        const disabledReason = trialLimitReached ? t('services.trialLimitDisabled') : '';

        return `
            ${bannerHtml}

            <div class="card" style="background:#e0e7ff;border-color:#818cf8;">
                <div class="card-header" style="background:#c7d2fe;">
                    <h3 class="card-title">🦷 ${t('services.aboutTitle')}</h3>
                </div>
                <div class="card-body">
                    <p><strong>${t('services.aboutDescription')}</strong></p>
                    <p style="margin-top:0.75rem;margin-bottom:0.5rem;"><strong>${t('services.configureWhat')}</strong></p>
                    <ul style="margin-left:1.25rem;line-height:1.6;">
                        <li>${t('services.configChairTime')}</li>
                        <li>${t('services.configDoctorFee')}</li>
                        <li>${t('services.configEquipment')}</li>
                        <li>${t('services.configConsumables')}</li>
                    </ul>
                    <p style="margin-top:0.5rem;color:var(--gray-700);"><em>${t('services.priceButtonHint')}</em></p>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">${t('services.servicesConfig')}</h3>
                    ${canAddService
                        ? `<button class="btn btn-primary" onclick="Pages.showServiceForm()">+ ${t('services.addService')}</button>`
                        : `<button class="btn btn-primary" disabled style="opacity:0.5;cursor:not-allowed;" title="${disabledReason}">+ ${t('services.addService')}</button>`
                    }
                </div>

                ${services.length > 0 ? `
                    <!-- Search & Filter Controls -->
                    <div class="table-controls">
                        <div class="search-wrapper">
                            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                            <input
                                type="search"
                                class="search-input"
                                id="servicesSearch"
                                placeholder="${t('common.search') || 'Search services...'}"
                                oninput="window.filterServicesDebounced()"
                            />
                        </div>
                        <div class="filter-group">
                            <select class="filter-select" id="servicesCategory" onchange="window.filterServices()">
                                <option value="all">${t('common.allCategories') || 'All Categories'}</option>
                                ${[...new Set(services.map(s => s.category_name).filter(Boolean))].map(cat =>
                                    `<option value="${cat}">${cat}</option>`
                                ).join('')}
                                ${services.some(s => !s.category_name) ? `<option value="uncategorized">${t('priceList.uncategorized')}</option>` : ''}
                            </select>
                        </div>
                    </div>
                ` : ''}

                <div class="card-body" style="padding:0;" id="servicesTableContainer">
                    ${services.length > 0 ? (() => {
                        // Group services by category
                        const grouped = {};
                        const uncategorized = [];
                        services.forEach(s => {
                            if (s.category_name) {
                                if (!grouped[s.category_name]) grouped[s.category_name] = [];
                                grouped[s.category_name].push(s);
                            } else {
                                uncategorized.push(s);
                            }
                        });

                        // Helper to format doctor fee display
                        const formatDoctorFee = (s) => {
                            const feeType = s.doctor_fee_type || 'hourly';
                            if (feeType === 'hourly') {
                                return `${formatCurrency(s.doctor_hourly_fee)}${t('services.perHour')}`;
                            } else if (feeType === 'fixed') {
                                return `${formatCurrency(s.doctor_fixed_fee)} (${t('services.fixed')})`;
                            } else if (feeType === 'percentage') {
                                return `${s.doctor_percentage}% ${t('services.ofFinal')}`;
                            }
                            return '-';
                        };

                        // Render service row
                        const renderServiceRow = (s) => {
                            return `
                                <tr data-service-id="${s.id}">
                                    <td style="padding-left:2rem;"><strong>${getLocalizedName(s)}</strong></td>
                                    <td>${s.chair_time_hours}</td>
                                    <td>${formatDoctorFee(s)}</td>
                                    <td>${s.equipment_name||'-'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-success" onclick="Pages.viewServicePrice(${s.id})" title="${t('services.viewPrice')}">💰</button>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.showServiceForm(${s.id})" title="${t('common.edit')}">✎</button>
                                        <button class="btn btn-sm btn-ghost" onclick="Pages.deleteService(${s.id})" title="${t('common.delete')}">🗑️</button>
                                    </td>
                                </tr>
                            `;
                        };

                        // Render mobile card for service
                        const renderServiceCard = (s) => {
                            return `
                                <div class="mobile-card" data-service-id="${s.id}">
                                    <div class="mobile-card-header">
                                        <div class="mobile-card-title">${getLocalizedName(s)}</div>
                                        <div class="mobile-card-actions">
                                            <button class="btn btn-sm btn-success" onclick="Pages.viewServicePrice(${s.id})" title="${t('services.viewPrice')}">💰</button>
                                            <button class="btn btn-sm btn-ghost" onclick="Pages.showServiceForm(${s.id})" title="${t('common.edit')}">✎</button>
                                            <button class="btn btn-sm btn-ghost" onclick="Pages.deleteService(${s.id})" title="${t('common.delete')}">🗑️</button>
                                        </div>
                                    </div>
                                    <div class="mobile-card-body">
                                        ${s.category_name ? `
                                            <div class="mobile-card-row">
                                                <span class="mobile-card-label">${t('common.category') || 'Category'}</span>
                                                <span class="mobile-card-value">📁 ${s.category_name}</span>
                                            </div>
                                        ` : ''}
                                        <div class="mobile-card-row">
                                            <span class="mobile-card-label">${t('services.chairTimeHrs')}</span>
                                            <span class="mobile-card-value">${s.chair_time_hours}h</span>
                                        </div>
                                        <div class="mobile-card-row">
                                            <span class="mobile-card-label">${t('services.doctorFee')}</span>
                                            <span class="mobile-card-value">${formatDoctorFee(s)}</span>
                                        </div>
                                        ${s.equipment_name ? `
                                            <div class="mobile-card-row">
                                                <span class="mobile-card-label">${t('services.equipment')}</span>
                                                <span class="mobile-card-value">${s.equipment_name}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        };

                        const categoryNames = Object.keys(grouped);
                        let tableRows = '';
                        let mobileCards = '';

                        // Render categorized services
                        categoryNames.forEach(catName => {
                            const categoryServices = grouped[catName];
                            tableRows += `
                                <tr class="category-header" style="background:var(--gray-100);">
                                    <td colspan="5" style="font-weight:600;color:var(--gray-700);padding:0.75rem 1rem;">
                                        📁 ${catName} <span style="font-weight:400;color:var(--gray-500);font-size:0.875rem;">(${categoryServices.length} ${categoryServices.length === 1 ? t('services.service') : t('services.services')})</span>
                                    </td>
                                </tr>
                            `;
                            tableRows += categoryServices.map(renderServiceRow).join('');
                            mobileCards += categoryServices.map(renderServiceCard).join('');
                        });

                        // Render uncategorized services
                        if (uncategorized.length > 0) {
                            tableRows += `
                                <tr class="category-header" style="background:var(--gray-100);">
                                    <td colspan="5" style="font-weight:600;color:var(--gray-500);padding:0.75rem 1rem;">
                                        📁 ${t('priceList.uncategorized')} <span style="font-weight:400;font-size:0.875rem;">(${uncategorized.length} ${uncategorized.length === 1 ? t('services.service') : t('services.services')})</span>
                                    </td>
                                </tr>
                            `;
                            tableRows += uncategorized.map(renderServiceRow).join('');
                            mobileCards += uncategorized.map(renderServiceCard).join('');
                        }

                        return `
                            <!-- Desktop Table View -->
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>${t('services.serviceName')}</th>
                                        <th>${t('services.chairTimeHrs')}</th>
                                        <th>${t('services.doctorFee')}</th>
                                        <th>${t('services.equipment')}</th>
                                        <th>${t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>

                            <!-- Mobile Card View -->
                            <div class="mobile-card-list">
                                ${mobileCards}
                            </div>
                        `;
                    })() : `
                        <div class="empty-state">
                            <div class="empty-state-icon">🦷</div>
                            <h3>${t('services.noServices')}</h3>
                            <p>${t('services.addFirst')}</p>
                            ${canAddService ? `
                                <div class="empty-state-actions">
                                    <button class="btn btn-primary" onclick="Pages.showServiceForm()">
                                        + ${t('services.addService')}
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `}
                </div>
            </div>

            <script>
                // Store services for filtering
                window.allServices = ${JSON.stringify(services)};

                // Filter services function
                window.filterServices = function() {
                    const searchValue = document.getElementById('servicesSearch')?.value || '';
                    const categoryValue = document.getElementById('servicesCategory')?.value || 'all';

                    let filtered = window.allServices;

                    // Apply search filter
                    if (searchValue) {
                        const search = searchValue.toLowerCase();
                        filtered = filtered.filter(s => {
                            const name = (s.name || s.service_name || '').toLowerCase();
                            const nameAr = (s.name_ar || '').toLowerCase();
                            const category = (s.category_name || '').toLowerCase();
                            const equipment = (s.equipment_name || '').toLowerCase();
                            return name.includes(search) || nameAr.includes(search) ||
                                   category.includes(search) || equipment.includes(search);
                        });
                    }

                    // Apply category filter
                    if (categoryValue && categoryValue !== 'all') {
                        if (categoryValue === 'uncategorized') {
                            filtered = filtered.filter(s => !s.category_name);
                        } else {
                            filtered = filtered.filter(s => s.category_name === categoryValue);
                        }
                    }

                    // Re-render table and cards
                    renderServicesTable(filtered);
                };

                // Debounced version for search input
                window.filterServicesDebounced = window.debounce(window.filterServices, 300);

                // Render services table/cards
                function renderServicesTable(servicesToRender) {
                    const container = document.getElementById('servicesTableContainer');
                    if (!container) return;

                    if (servicesToRender.length === 0) {
                        container.innerHTML = \`
                            <div class="empty-state">
                                <div class="empty-state-icon">🔍</div>
                                <h3>\${t('common.noResults') || 'No results found'}</h3>
                                <p>\${t('common.tryDifferentSearch') || 'Try adjusting your search or filters'}</p>
                            </div>
                        \`;
                        return;
                    }

                    // Helper functions (same as above)
                    const formatDoctorFee = (s) => {
                        const feeType = s.doctor_fee_type || 'hourly';
                        if (feeType === 'hourly') return \`\${formatCurrency(s.doctor_hourly_fee)}\${t('services.perHour')}\`;
                        if (feeType === 'fixed') return \`\${formatCurrency(s.doctor_fixed_fee)} (\${t('services.fixed')})\`;
                        if (feeType === 'percentage') return \`\${s.doctor_percentage}% \${t('services.ofFinal')}\`;
                        return '-';
                    };

                    const renderServiceRow = (s) => \`
                        <tr data-service-id="\${s.id}">
                            <td style="padding-left:2rem;"><strong>\${getLocalizedName(s)}</strong></td>
                            <td>\${s.chair_time_hours}</td>
                            <td>\${formatDoctorFee(s)}</td>
                            <td>\${s.equipment_name||'-'}</td>
                            <td>
                                <button class="btn btn-sm btn-success" onclick="Pages.viewServicePrice(\${s.id})" title="\${t('services.viewPrice')}">💰</button>
                                <button class="btn btn-sm btn-ghost" onclick="Pages.showServiceForm(\${s.id})" title="\${t('common.edit')}">✎</button>
                                <button class="btn btn-sm btn-ghost" onclick="Pages.deleteService(\${s.id})" title="\${t('common.delete')}">🗑️</button>
                            </td>
                        </tr>
                    \`;

                    const renderServiceCard = (s) => \`
                        <div class="mobile-card" data-service-id="\${s.id}">
                            <div class="mobile-card-header">
                                <div class="mobile-card-title">\${getLocalizedName(s)}</div>
                                <div class="mobile-card-actions">
                                    <button class="btn btn-sm btn-success" onclick="Pages.viewServicePrice(\${s.id})" title="\${t('services.viewPrice')}">💰</button>
                                    <button class="btn btn-sm btn-ghost" onclick="Pages.showServiceForm(\${s.id})" title="\${t('common.edit')}">✎</button>
                                    <button class="btn btn-sm btn-ghost" onclick="Pages.deleteService(\${s.id})" title="\${t('common.delete')}">🗑️</button>
                                </div>
                            </div>
                            <div class="mobile-card-body">
                                \${s.category_name ? \`
                                    <div class="mobile-card-row">
                                        <span class="mobile-card-label">\${t('common.category') || 'Category'}</span>
                                        <span class="mobile-card-value">📁 \${s.category_name}</span>
                                    </div>
                                \` : ''}
                                <div class="mobile-card-row">
                                    <span class="mobile-card-label">\${t('services.chairTimeHrs')}</span>
                                    <span class="mobile-card-value">\${s.chair_time_hours}h</span>
                                </div>
                                <div class="mobile-card-row">
                                    <span class="mobile-card-label">\${t('services.doctorFee')}</span>
                                    <span class="mobile-card-value">\${formatDoctorFee(s)}</span>
                                </div>
                                \${s.equipment_name ? \`
                                    <div class="mobile-card-row">
                                        <span class="mobile-card-label">\${t('services.equipment')}</span>
                                        <span class="mobile-card-value">\${s.equipment_name}</span>
                                    </div>
                                \` : ''}
                            </div>
                        </div>
                    \`;

                    // Group by category
                    const grouped = {};
                    const uncategorized = [];
                    servicesToRender.forEach(s => {
                        if (s.category_name) {
                            if (!grouped[s.category_name]) grouped[s.category_name] = [];
                            grouped[s.category_name].push(s);
                        } else {
                            uncategorized.push(s);
                        }
                    });

                    let tableRows = '';
                    let mobileCards = '';

                    // Render categories
                    Object.keys(grouped).forEach(catName => {
                        const categoryServices = grouped[catName];
                        tableRows += \`
                            <tr class="category-header" style="background:var(--gray-100);">
                                <td colspan="5" style="font-weight:600;color:var(--gray-700);padding:0.75rem 1rem;">
                                    📁 \${catName} <span style="font-weight:400;color:var(--gray-500);font-size:0.875rem;">(\${categoryServices.length})</span>
                                </td>
                            </tr>
                        \`;
                        tableRows += categoryServices.map(renderServiceRow).join('');
                        mobileCards += categoryServices.map(renderServiceCard).join('');
                    });

                    // Render uncategorized
                    if (uncategorized.length > 0) {
                        tableRows += \`
                            <tr class="category-header" style="background:var(--gray-100);">
                                <td colspan="5" style="font-weight:600;color:var(--gray-500);padding:0.75rem 1rem;">
                                    📁 \${t('priceList.uncategorized')} <span style="font-weight:400;font-size:0.875rem;">(\${uncategorized.length})</span>
                                </td>
                            </tr>
                        \`;
                        tableRows += uncategorized.map(renderServiceRow).join('');
                        mobileCards += uncategorized.map(renderServiceCard).join('');
                    }

                    container.innerHTML = \`
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>\${t('services.serviceName')}</th>
                                    <th>\${t('services.chairTimeHrs')}</th>
                                    <th>\${t('services.doctorFee')}</th>
                                    <th>\${t('services.equipment')}</th>
                                    <th>\${t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                \${tableRows}
                            </tbody>
                        </table>
                        <div class="mobile-card-list">
                            \${mobileCards}
                        </div>
                    \`;
                }
            </script>
        `;
    },

    async showServiceForm(id=null) {
        const equipment = await API.get('/api/equipment');
        const consumables = await API.get('/api/consumables');
        const categories = await API.get('/api/categories');
        // Store consumables globally so addConsumableRow can access them
        window.serviceFormConsumables = consumables;

        let service = null;
        if (id) {
            service = await API.get(`/api/services/${id}`);
        }

        // Count consumables and equipment for badge
        const consumablesCount = service?.consumables?.length || 0;
        const equipmentCount = service?.equipment_list?.length || 0;
        const hasEquipment = equipmentCount > 0;
        const hasCustomProfit = !(service?.use_default_profit === undefined || service?.use_default_profit === null || service?.use_default_profit == 1 || service?.use_default_profit === true);

        // Store equipment globally for addEquipmentRow
        window.serviceFormEquipment = equipment.filter(e => e.allocation_type === 'per-hour');

        const content = `
            <form id="serviceForm">
                <!-- Live Price Preview Card -->
                <div id="livePricePreview" class="price-preview-card" style="display:none;">
                    <div class="price-preview-header">
                        <span class="price-preview-label">${t('services.calculatedPrice') || 'Calculated Price'}</span>
                    </div>
                    <div class="price-preview-amount">
                        <span id="previewAmount">0.00</span>
                        <span class="price-preview-currency">${APP.settings?.currency || 'EGP'}</span>
                    </div>
                    <div class="price-preview-breakdown">
                        <div class="price-preview-item">
                            <span class="price-preview-item-label">${t('dashboard.cost') || 'Cost'}</span>
                            <span class="price-preview-item-value" id="previewCost">0.00</span>
                        </div>
                        <div class="price-preview-item">
                            <span class="price-preview-item-label">${t('services.profitMargin') || 'Profit Margin'}</span>
                            <span class="price-preview-item-value" id="previewProfit">0%</span>
                        </div>
                    </div>
                </div>

                <!-- Essential Fields Section -->
                <section class="form-section-essential">
                    <div class="form-row">
                        <div class="form-group" style="flex:2;">
                            <label class="form-label required">${t('services.serviceName')}</label>
                            <input type="text" class="form-input" name="name" value="${service?.name||''}" placeholder="${t('services.serviceNamePlaceholder')}" required>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label class="form-label required">${t('services.category')}</label>
                            <select class="form-select" name="category_id" required>
                                <option value="">${t('services.selectCategory')}</option>
                                ${categories.map(c => `<option value="${c.id}" ${service?.category_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('services.serviceNameArabic')}</label>
                        <input type="text" class="form-input" name="name_ar" value="${service?.name_ar||''}" dir="rtl" placeholder="${t('services.serviceNameArabicPlaceholder')}" style="font-family: 'Noto Sans Arabic', var(--font-sans);">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label required">${t('services.chairTime')}</label>
                            <div class="input-with-unit">
                                <input type="number" class="form-input" name="chair_time_hours" value="${service?.chair_time_hours||''}" step="0.25" min="0.25" placeholder="e.g., 1.5" required>
                                <span class="input-unit">${t('services.hours')}</span>
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
                            <label class="form-label required">${t('services.doctorFeeType')}</label>
                            <select class="form-input" name="doctor_fee_type" id="doctorFeeTypeSelect" onchange="window.toggleDoctorFeeInputs()" required>
                                <option value="hourly" ${(!service || service.doctor_fee_type === 'hourly') ? 'selected' : ''}>${t('services.hourlyRate')}</option>
                                <option value="fixed" ${service?.doctor_fee_type === 'fixed' ? 'selected' : ''}>${t('services.fixedFee')}</option>
                                <option value="percentage" ${service?.doctor_fee_type === 'percentage' ? 'selected' : ''}>${t('services.percentage')}</option>
                            </select>
                        </div>
                        <div class="form-group" id="doctorHourlyFeeGroup" style="display:${(!service || service.doctor_fee_type === 'hourly') ? 'block' : 'none'}">
                            <label class="form-label required">${t('services.doctorFeePerHour')}</label>
                            <div class="input-with-unit">
                                <input type="number" class="form-input" name="doctor_hourly_fee" value="${service?.doctor_hourly_fee||''}" step="1" placeholder="e.g., 500">
                                <span class="input-unit">${APP.settings?.currency || 'EGP'}${t('services.perHour')}</span>
                            </div>
                        </div>
                        <div class="form-group" id="doctorFixedFeeGroup" style="display:${service?.doctor_fee_type === 'fixed' ? 'block' : 'none'}">
                            <label class="form-label required">${t('services.fixedDoctorFee')}</label>
                            <div class="input-with-unit">
                                <input type="number" class="form-input" name="doctor_fixed_fee" value="${service?.doctor_fixed_fee||''}" step="1" placeholder="e.g., 1000">
                                <span class="input-unit">${APP.settings?.currency || 'EGP'}</span>
                            </div>
                        </div>
                        <div class="form-group" id="doctorPercentageGroup" style="display:${service?.doctor_fee_type === 'percentage' ? 'block' : 'none'}">
                            <label class="form-label required">${t('services.doctorFeePercentage')}</label>
                            <div class="input-with-unit">
                                <input type="number" class="form-input" name="doctor_percentage" value="${service?.doctor_percentage||''}" step="0.1" placeholder="e.g., 30" min="0" max="100">
                                <span class="input-unit">%</span>
                            </div>
                            <small style="color:var(--gray-500);font-size:0.8125rem;">${t('services.doctorFeePercentageHelp')}</small>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('services.currentMarketPrice')}</label>
                        <div class="input-with-unit">
                            <input type="number" class="form-input" name="current_price" value="${service?.current_price||''}" step="1" placeholder="What you currently charge">
                            <span class="input-unit">${APP.settings?.currency || 'EGP'}</span>
                        </div>
                        <small style="color:var(--gray-500);font-size:0.8125rem;">${t('services.currentMarketPriceHelp')}</small>
                    </div>
                </section>

                <!-- Collapsible: Consumables & Materials -->
                <section class="form-section-collapsible ${consumablesCount > 0 ? 'is-open' : ''}">
                    <button type="button" class="section-toggle" aria-expanded="${consumablesCount > 0 ? 'true' : 'false'}" onclick="window.toggleFormSection(this)">
                        <span class="toggle-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                        </span>
                        <span class="toggle-title">${t('services.consumablesSection')}</span>
                        <span class="toggle-badge">${consumablesCount > 0 ? consumablesCount + ' ' + t('services.items') : t('services.optional')}</span>
                    </button>
                    <div class="section-content" ${consumablesCount > 0 ? '' : 'hidden'}>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                            <small style="color:var(--gray-600);">${t('services.consumablesHelp')}</small>
                            <button type="button" class="btn btn-sm btn-primary" onclick="addConsumableRow()">+ ${t('common.add')}</button>
                        </div>
                        <div class="consumables-header" style="display:flex;gap:0.5rem;margin-bottom:0.25rem;padding:0 0.25rem;font-size:0.75rem;color:var(--gray-500);font-weight:600;">
                            <span style="flex:2;">${t('services.consumable')}</span>
                            <span style="width:70px;">${t('services.qty')}</span>
                            <span style="width:90px;">${t('services.unitPrice')}</span>
                            <span style="width:80px;">${t('dashboard.cost')}</span>
                            <span style="width:32px;"></span>
                        </div>
                        <div id="consumablesContainer">
                            ${!service?.consumables?.length ? '<div class="empty-consumables" style="color:var(--gray-500);text-align:center;padding:1rem;background:var(--gray-50);border-radius:var(--radius);border:1px dashed var(--gray-300);">' + t('services.noConsumablesYet') + '</div>' : ''}
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
                        <span class="toggle-title">${t('services.specialEquipment')}</span>
                        <span class="toggle-badge">${equipmentCount > 0 ? equipmentCount + ' ' + t('services.items') : t('services.optional')}</span>
                    </button>
                    <div class="section-content" ${hasEquipment ? '' : 'hidden'}>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                            <small style="color:var(--gray-600);">${t('services.equipmentHelp')}</small>
                            <button type="button" class="btn btn-sm btn-primary" onclick="addEquipmentRow()">+ ${t('common.add')}</button>
                        </div>
                        <div class="equipment-header" style="display:flex;gap:0.5rem;margin-bottom:0.25rem;padding:0 0.25rem;font-size:0.75rem;color:var(--gray-500);font-weight:600;">
                            <span style="flex:2;">${t('services.equipment')}</span>
                            <span style="flex:1;">${t('services.usageTime')}</span>
                            <span style="width:32px;"></span>
                        </div>
                        <div id="equipmentContainer">
                            ${!hasEquipment ? `<div class="empty-equipment" style="color:var(--gray-500);text-align:center;padding:1rem;background:var(--gray-50);border-radius:var(--radius);border:1px dashed var(--gray-300);">${t('services.noEquipmentYet')}</div>` : ''}
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
                        <span class="toggle-title">${t('services.customPricing')}</span>
                        <span class="toggle-badge">${hasCustomProfit ? service.custom_profit_percent + '%' : t('services.usingDefault')}</span>
                    </button>
                    <div class="section-content" ${hasCustomProfit ? '' : 'hidden'}>
                        <div class="form-group">
                            <label class="form-label" style="display:flex;align-items:center;gap:0.5rem;">
                                <input type="checkbox" name="use_default_profit" ${!hasCustomProfit ? 'checked' : ''} onchange="window.toggleCustomProfit(this)" style="width:18px;height:18px;">
                                <span>${t('services.useDefaultProfitMargin')}</span>
                            </label>
                        </div>
                        <div class="form-group" id="customProfitGroup" style="display:${hasCustomProfit ? 'block' : 'none'}">
                            <label class="form-label">${t('services.customProfitMarginLabel')}</label>
                            <div class="input-with-unit">
                                <input type="number" class="form-input" name="custom_profit_percent" value="${service?.custom_profit_percent||''}" step="1" placeholder="e.g., 50">
                                <span class="input-unit">%</span>
                            </div>
                            <small style="color:var(--gray-500);font-size:0.8125rem;">${t('services.customProfitHelp')}</small>
                        </div>
                    </div>
                </section>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">${t('common.cancel')}</button>
                    <button type="submit" class="btn btn-primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:0.25rem;">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        ${t('services.saveService')}
                    </button>
                </div>
            </form>
        `;

        openModal(id ? t('modal.editService') : t('modal.addService'), content, 'modal-lg');

        // Load existing consumables after modal opens (script tags in innerHTML don't execute)
        if (service?.consumables?.length > 0) {
            service.consumables.forEach(sc => {
                window.addConsumableRow(sc.consumable_id, sc.quantity, sc.custom_unit_price);
            });
        }

        // Load existing equipment
        if (service?.equipment_list?.length > 0) {
            service.equipment_list.forEach(eq => {
                window.addEquipmentRow(eq.equipment_id, eq.hours_used);
            });
        }

        // Setup real-time form validation
        setupRealtimeValidation('serviceForm', {
            'name': { required: true },
            'category_id': { required: true },
            'chair_time_hours': { required: true, min: 0.25 },
            'doctor_hourly_fee': { min: 0 },
            'doctor_fixed_fee': { min: 0 },
            'doctor_percentage': { min: 0, max: 100 }
        });

        // Live price calculation function
        window.updateLivePricePreview = function() {
            const form = document.getElementById('serviceForm');
            if (!form) return;

            const chairTime = parseFloat(form.querySelector('[name="chair_time_hours"]')?.value) || 0;
            const doctorFeeType = form.querySelector('[name="doctor_fee_type"]')?.value || 'hourly';
            const doctorHourlyFee = parseFloat(form.querySelector('[name="doctor_hourly_fee"]')?.value) || 0;
            const doctorFixedFee = parseFloat(form.querySelector('[name="doctor_fixed_fee"]')?.value) || 0;
            const doctorPercentage = parseFloat(form.querySelector('[name="doctor_percentage"]')?.value) || 0;
            const useDefaultProfit = form.querySelector('[name="use_default_profit"]')?.checked;
            const customProfit = parseFloat(form.querySelector('[name="custom_profit_percent"]')?.value) || 0;

            // Calculate doctor cost
            let doctorCost = 0;
            if (doctorFeeType === 'hourly') {
                doctorCost = doctorHourlyFee * chairTime;
            } else if (doctorFeeType === 'fixed') {
                doctorCost = doctorFixedFee;
            }

            // Get overhead cost from settings (simplified - actual calculation would need API call)
            const overheadPerHour = (APP.settings?.total_overhead_per_hour || 0);
            const overheadCost = overheadPerHour * chairTime;

            // Calculate consumables cost
            let consumablesCost = 0;
            document.querySelectorAll('[data-consumable-cost]').forEach(el => {
                const costText = el.textContent.replace(/[^0-9.]/g, '');
                consumablesCost += parseFloat(costText) || 0;
            });

            // Total cost
            const totalCost = doctorCost + overheadCost + consumablesCost;

            // Calculate price with profit margin
            const profitMargin = useDefaultProfit ? (APP.settings?.default_profit_margin || 30) : customProfit;
            let calculatedPrice = totalCost * (1 + profitMargin / 100);

            // If doctor fee is percentage, solve for price
            if (doctorFeeType === 'percentage') {
                calculatedPrice = (overheadCost + consumablesCost) / (1 - (profitMargin + doctorPercentage) / 100);
            }

            // Update preview card
            const previewCard = document.getElementById('livePricePreview');
            const previewAmount = document.getElementById('previewAmount');
            const previewCost = document.getElementById('previewCost');
            const previewProfit = document.getElementById('previewProfit');

            if (chairTime > 0 && (doctorHourlyFee > 0 || doctorFixedFee > 0 || doctorPercentage > 0)) {
                previewCard.style.display = 'block';
                previewAmount.textContent = calculatedPrice.toFixed(2);
                previewCost.textContent = totalCost.toFixed(2);
                previewProfit.textContent = profitMargin.toFixed(0) + '%';
            } else {
                previewCard.style.display = 'none';
            }
        };

        // Attach live price preview to relevant inputs
        const priceInputs = [
            '[name="chair_time_hours"]',
            '[name="doctor_fee_type"]',
            '[name="doctor_hourly_fee"]',
            '[name="doctor_fixed_fee"]',
            '[name="doctor_percentage"]',
            '[name="use_default_profit"]',
            '[name="custom_profit_percent"]'
        ];

        priceInputs.forEach(selector => {
            const input = document.querySelector(selector);
            if (input) {
                input.addEventListener('input', window.updateLivePricePreview);
                input.addEventListener('change', window.updateLivePricePreview);
            }
        });

        // Trigger initial calculation if editing
        if (service) {
            setTimeout(window.updateLivePricePreview, 100);
        }

        document.getElementById('serviceForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(e.target));
            formData.chair_time_hours = parseFloat(formData.chair_time_hours);

            // Doctor fee handling based on type
            formData.doctor_fee_type = formData.doctor_fee_type || 'hourly';
            if (formData.doctor_fee_type === 'hourly') {
                formData.doctor_hourly_fee = parseFloat(formData.doctor_hourly_fee) || 0;
                formData.doctor_fixed_fee = 0;
                formData.doctor_percentage = 0;
            } else if (formData.doctor_fee_type === 'fixed') {
                formData.doctor_hourly_fee = 0;
                formData.doctor_fixed_fee = parseFloat(formData.doctor_fixed_fee) || 0;
                formData.doctor_percentage = 0;
            } else if (formData.doctor_fee_type === 'percentage') {
                formData.doctor_hourly_fee = 0;
                formData.doctor_fixed_fee = 0;
                formData.doctor_percentage = parseFloat(formData.doctor_percentage) || 0;
            }

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
            // Remove legacy single equipment fields (we now use equipment_list)
            delete formData.equipment_id;
            delete formData.equipment_hours_used;

            // Collect consumables data (with optional custom unit price)
            formData.consumables = [];
            document.querySelectorAll('.consumable-row').forEach(row => {
                const select = row.querySelector('[data-consumable-select]');
                const quantity = row.querySelector('[data-consumable-quantity]');
                const unitPrice = row.querySelector('[data-consumable-unit-price]');
                const defaultPrice = row.querySelector('[data-consumable-default-price]');

                if (select.value && quantity.value) {
                    const consumableData = {
                        consumable_id: parseInt(select.value),
                        quantity: parseFloat(quantity.value)
                    };

                    // Include custom_unit_price only if it differs from default
                    if (unitPrice && unitPrice.value && defaultPrice && defaultPrice.value) {
                        const enteredPrice = parseFloat(unitPrice.value);
                        const calcDefaultPrice = parseFloat(defaultPrice.value);
                        // Only save if custom price differs from default (with small tolerance for floating point)
                        if (Math.abs(enteredPrice - calcDefaultPrice) > 0.001) {
                            consumableData.custom_unit_price = enteredPrice;
                        }
                    }

                    formData.consumables.push(consumableData);
                }
            });

            // Collect equipment data
            formData.equipment_list = [];
            document.querySelectorAll('.equipment-row').forEach(row => {
                const select = row.querySelector('[data-equipment-select]');
                const hours = row.querySelector('[data-equipment-hours]');
                if (select.value && hours.value) {
                    formData.equipment_list.push({
                        equipment_id: parseInt(select.value),
                        hours_used: parseFloat(hours.value)
                    });
                }
            });

            try {
                if (id) {
                    await API.put(`/api/services/${id}`, formData);
                } else {
                    await API.post('/api/services', formData);
                }
                showToast(t('toast.serviceSaved'));
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
            <div class="modal-content-wrapper">
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
                        <tr>
                            <td>
                                Doctor Fee
                                ${(() => {
                                    const feeType = service.doctor_fee_type || 'hourly';
                                    if (feeType === 'hourly') {
                                        return `<span style="font-size:0.75rem;color:#64748b;"> (${formatCurrency(service.doctor_hourly_fee)}/hr × ${service.chair_time_hours}hrs)</span>`;
                                    } else if (feeType === 'fixed') {
                                        return `<span style="font-size:0.75rem;color:#64748b;"> (Fixed fee)</span>`;
                                    } else if (feeType === 'percentage') {
                                        return `<span style="font-size:0.75rem;color:#64748b;"> (${service.doctor_percentage}% of rounded final price)</span>`;
                                    }
                                    return '';
                                })()}
                            </td>
                            <td style="text-align:right;">${formatCurrency(price.doctor_fee)}</td>
                        </tr>
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
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Close</button>
            </div>
            </div>
        `;

        openModal(t('modal.priceCalculation'), content, 'modal-lg');
    },

    async deleteService(id) {
        deleteWithUndo(
            'service',
            id,
            async (itemId) => await API.delete(`/api/services/${itemId}`),
            () => APP.loadPage('services')
        );
    },

    async priceList() {
        // Check subscription status - consistent with services() logic
        const sub = APP.subscription || {};
        const isSuspended = sub.is_suspended === true;
        const isTrial = sub.restriction_level === 'trial';
        const trialDaysLeft = sub.trial_days_remaining || 0;
        const trialEnded = sub.trial_ended === true;
        const isExpiredOrGracePeriod = sub.restriction_level === 'lockout' || sub.restriction_level === 'readonly';
        const maxTrialServices = sub.max_trial_services || 2;

        // LOCKOUT RULES (same logic as services page):
        // 1. Suspended (inactive) = show subscription wall
        // 2. Trial ended (7 days passed) = show subscription wall
        // 3. Subscription expired/grace period = show subscription wall
        // Trial users CAN see the price list (limited to 2 services)
        const isFullLockout = isSuspended || trialEnded || isExpiredOrGracePeriod;

        if (isFullLockout) {
            let title, description, iconStyle;

            if (isSuspended) {
                title = t('subscription.accountOnHold');
                description = t('subscription.onHoldMessage');
                iconStyle = 'background: linear-gradient(135deg, #fef2f2, #fee2e2); color: var(--danger);';
            } else if (trialEnded) {
                title = t('subscription.trialEnded');
                description = t('priceList.trialEndedMessage');
                iconStyle = 'background: linear-gradient(135deg, #fef2f2, #fee2e2); color: var(--danger);';
            } else {
                title = t('subscription.timeToRenew');
                description = t('priceList.renewMessagePriceList');
                iconStyle = 'background: linear-gradient(135deg, #fef2f2, #fee2e2); color: var(--danger);';
            }

            return `
                <div class="subscription-wall">
                    <div class="subscription-wall-content">
                        <div class="subscription-icon" style="${iconStyle}">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                <circle cx="12" cy="16" r="1"/>
                            </svg>
                        </div>
                        <h2>${title}</h2>
                        <p class="subscription-description">${description}</p>

                        <div class="subscription-plan-card">
                            <div class="plan-header">
                                <h3>${t('subscription.dentalPricingPro')}</h3>
                                <span class="plan-badge">${t('subscription.fullAccess')}</span>
                            </div>
                            <ul class="plan-features">
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    ${t('priceList.completePriceCalcs')}
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    ${t('subscription.priceListExport')}
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    ${t('priceList.unlimitedServicesMaterials')}
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    ${t('subscription.smartInsights')}
                                </li>
                                <li>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    ${t('subscription.prioritySupport')}
                                </li>
                            </ul>
                        </div>

                        <div class="subscription-contact">
                            <p>${t('subscription.readyToUpgrade')}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        let priceList = await API.get('/api/price-list');

        // For trial users, limit to first 2 services
        const totalServices = priceList.length;
        if (isTrial && priceList.length > maxTrialServices) {
            priceList = priceList.slice(0, maxTrialServices);
        }
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
            if (!p.current_price) return { html: `<span class="price-health-none">${t('priceList.noPriceData')}</span>`, status: 'none' };

            const variance = p.rounded_price - p.current_price;
            const variancePercent = ((variance / p.current_price) * 100);
            const absVariance = Math.abs(variance);
            const absPercent = Math.abs(variancePercent).toFixed(0);

            // Calculate position on the health bar (0-100)
            // Zone layout: under (0-40%), optimal (40-60%), over (60-100%)
            // Map: -50% variance = 0%, 0% variance = 50%, +50% variance = 100%
            let position = 50 + (variancePercent);
            position = Math.max(8, Math.min(92, position));

            if (Math.abs(variancePercent) <= 5) {
                return {
                    html: `<div class="price-health optimal">
                        <div class="health-bar">
                            <div class="health-zone zone-under" title="${t('priceList.underpricedZone')}"></div>
                            <div class="health-zone zone-optimal" title="${t('priceList.optimalZone')}"></div>
                            <div class="health-zone zone-over" title="${t('priceList.extraMarginZone')}"></div>
                            <div class="health-indicator" style="left:${position}%" title="${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(1)}%"></div>
                        </div>
                        <span class="health-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
                            ${t('priceList.perfect')} ${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(0)}%
                        </span>
                    </div>`,
                    status: 'optimal'
                };
            } else if (variance > 0) {
                return {
                    html: `<div class="price-health underpriced">
                        <div class="health-bar">
                            <div class="health-zone zone-under" title="${t('priceList.underpricedZone')}"></div>
                            <div class="health-zone zone-optimal" title="${t('priceList.optimalZone')}"></div>
                            <div class="health-zone zone-over" title="${t('priceList.extraMarginZone')}"></div>
                            <div class="health-indicator" style="left:${position}%" title="+${variancePercent.toFixed(1)}%"></div>
                        </div>
                        <span class="health-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                            ${t('priceList.raiseBy')} ${formatCurrency(absVariance)}
                        </span>
                    </div>`,
                    status: 'underpriced'
                };
            } else {
                return {
                    html: `<div class="price-health overpriced">
                        <div class="health-bar">
                            <div class="health-zone zone-under" title="${t('priceList.underpricedZone')}"></div>
                            <div class="health-zone zone-optimal" title="${t('priceList.optimalZone')}"></div>
                            <div class="health-zone zone-over" title="${t('priceList.extraMarginZone')}"></div>
                            <div class="health-indicator" style="left:${position}%" title="${variancePercent.toFixed(1)}%"></div>
                        </div>
                        <span class="health-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
                            +${formatCurrency(absVariance)} ${t('priceList.buffer')}
                        </span>
                    </div>`,
                    status: 'overpriced'
                };
            }
        };

        // Summary cards HTML
        const summaryHtml = servicesWithPrice.length > 0 ? `
            <div class="metrics-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:1.5rem;">
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: var(--primary-100); color: var(--primary-600);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                                <rect x="9" y="3" width="6" height="4" rx="1"/>
                            </svg>
                        </span>
                        <span class="metric-label">${t('priceList.servicesTracked')}</span>
                    </div>
                    <div class="metric-value">${servicesWithPrice.length}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('priceList.withCurrentPricing')}</span>
                    </div>
                </div>
                <div class="metric-card ${underpriced.length > 0 ? 'metric-highlight' : ''}">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: ${underpriced.length > 0 ? '#fef3c7' : '#d1fae5'}; color: ${underpriced.length > 0 ? 'var(--warning)' : 'var(--success)'};">
                            ${underpriced.length > 0 ?
                                '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 15a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-1-2V9h2v6h-2z"/></svg>' :
                                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
                            }
                        </span>
                        <span class="metric-label">${underpriced.length > 0 ? t('priceList.underpriced') : t('priceList.noneUnderpriced')}</span>
                    </div>
                    <div class="metric-value">${underpriced.length}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${underpriced.length > 0 ? t('priceList.needPriceIncrease') : t('priceList.allPricedWell')}</span>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #d1fae5; color: var(--success);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                        <span class="metric-label">${t('priceList.optimalPricing')}</span>
                    </div>
                    <div class="metric-value" style="color: var(--success);">${optimal.length}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('priceList.withinRange')}</span>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: ${totalVariance > 0 ? '#fee2e2' : '#dbeafe'}; color: ${totalVariance > 0 ? 'var(--danger)' : 'var(--info)'};">
                            ${totalVariance > 0 ?
                                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' :
                                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m7-7l-7 7-7-7"/></svg>'
                            }
                        </span>
                        <span class="metric-label">${totalVariance > 0 ? t('priceList.lostRevenue') : t('priceList.extraMargin')}</span>
                    </div>
                    <div class="metric-value currency" style="color: ${totalVariance > 0 ? 'var(--danger)' : 'var(--success)'};">${totalVariance > 0 ? '+' : ''}${formatCurrency(totalVariance)}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('priceList.perServiceRendered')}</span>
                    </div>
                </div>
            </div>
            ${underpriced.length > 0 ? `
                <div style="background:linear-gradient(90deg,#fef3c7,#fde68a);border-left:4px solid #f59e0b;padding:1rem 1.25rem;border-radius:8px;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;">
                    <span style="font-size:2rem;">💡</span>
                    <div>
                        <strong style="color:#b45309;">${t('priceList.pricingOpportunityFound')}</strong>
                        <p style="margin:0.25rem 0 0;color:#92400e;font-size:0.875rem;">
                            ${t('priceList.underpricedServicesMsg', { count: underpriced.length, amount: formatCurrency(underpriced.reduce((sum, p) => sum + (p.rounded_price - p.current_price), 0)) })}
                        </p>
                    </div>
                </div>
            ` : `
                <div style="background:linear-gradient(90deg,#dcfce7,#bbf7d0);border-left:4px solid #22c55e;padding:1rem 1.25rem;border-radius:8px;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;">
                    <span style="font-size:2rem;">🏆</span>
                    <div>
                        <strong style="color:#15803d;">${t('priceList.excellentPricing')}</strong>
                        <p style="margin:0.25rem 0 0;color:#166534;font-size:0.875rem;">
                            ${t('priceList.allServicesWellPriced')}
                        </p>
                    </div>
                </div>
            `}
        ` : '';

        // Trial banner for limited access
        const trialBannerHtml = isTrial ? `
            <div class="restriction-banner restriction-banner-info">
                <div class="restriction-banner-icon">🎁</div>
                <div class="restriction-banner-content">
                    <h4>${t('priceList.trialBannerTitle')}</h4>
                    <p>${t('priceList.trialBannerMsg', { maxServices: maxTrialServices, daysLeft: trialDaysLeft })}${totalServices > maxTrialServices ? ` (${t('priceList.showingOfServices', { shown: maxTrialServices, total: totalServices })})` : ''}</p>
                </div>
                <button class="btn btn-primary" onclick="APP.loadPage('subscription')">${t('priceList.upgradeNow')}</button>
            </div>
        ` : '';

        return `
            ${trialBannerHtml}
            <div class="card" style="background:#d1fae5;border-color:#34d399;">
                <div class="card-header" style="background:#a7f3d0;">
                    <h3 class="card-title">💰 ${t('priceList.overview')}</h3>
                </div>
                <div class="card-body">
                    <p><strong>${t('priceList.overviewDescription')}</strong></p>
                    <p style="margin-top:0.5rem;color:var(--gray-700);">
                        ${t('priceList.priceIncludesDesc', { profitPercent: settings.default_profit_percent, vatPercent: settings.vat_percent })}
                    </p>
                    <p style="margin-top:0.5rem;color:var(--gray-700);"><em>💡 ${t('priceList.addCurrentPriceTip')}</em></p>
                </div>
            </div>

            ${summaryHtml}

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">${t('priceList.completePriceList')}</h3>
                    <button class="btn btn-primary" onclick="window.print()">🖨️ ${t('priceList.print')}</button>
                </div>
                <div class="card-body" style="padding:0;">
                    ${priceList.length > 0 ? (() => {
                        // Group services by category
                        const grouped = {};
                        const uncategorized = [];
                        priceList.forEach(p => {
                            if (p.category_name) {
                                if (!grouped[p.category_name]) grouped[p.category_name] = [];
                                grouped[p.category_name].push(p);
                            } else {
                                uncategorized.push(p);
                            }
                        });

                        // Render table with category headers
                        const renderServiceRow = (p) => {
                            const variance = getVarianceDisplay(p);
                            return `
                                <tr style="${variance.status === 'underpriced' ? 'background:#fffbeb;' : ''}">
                                    <td style="padding-left:2rem;"><strong>${getLocalizedName(p)}</strong></td>
                                    <td>${formatCurrency(p.total_cost)}</td>
                                    <td><span class="badge badge-success">${p.profit_percent}%</span></td>
                                    <td><strong style="color:var(--primary-600);">${formatCurrency(p.rounded_price)}</strong></td>
                                    <td>${p.current_price ? formatCurrency(p.current_price) : `<span style="color:#94a3b8;font-size:0.8rem;">${t('priceList.notSet')}</span>`}</td>
                                    <td>${variance.html}</td>
                                </tr>
                            `;
                        };

                        const categoryNames = Object.keys(grouped);
                        let tableRows = '';

                        // Render categorized services
                        categoryNames.forEach(catName => {
                            tableRows += `
                                <tr class="category-header" style="background:var(--gray-100);">
                                    <td colspan="6" style="font-weight:600;color:var(--gray-700);padding:0.75rem 1rem;">
                                        📁 ${catName} <span style="font-weight:400;color:var(--gray-500);font-size:0.875rem;">(${grouped[catName].length} ${t('priceList.services')})</span>
                                    </td>
                                </tr>
                            `;
                            tableRows += grouped[catName].map(renderServiceRow).join('');
                        });

                        // Render uncategorized services
                        if (uncategorized.length > 0) {
                            tableRows += `
                                <tr class="category-header" style="background:var(--gray-100);">
                                    <td colspan="6" style="font-weight:600;color:var(--gray-500);padding:0.75rem 1rem;">
                                        📁 ${t('priceList.uncategorized')} <span style="font-weight:400;font-size:0.875rem;">(${uncategorized.length} ${t('priceList.services')})</span>
                                    </td>
                                </tr>
                            `;
                            tableRows += uncategorized.map(renderServiceRow).join('');
                        }

                        return `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>${t('priceList.service')}</th>
                                        <th>${t('priceList.totalCost')}</th>
                                        <th>${t('priceList.profit')}</th>
                                        <th>${t('priceList.calculatedPrice')}</th>
                                        <th>${t('priceList.currentPrice')}</th>
                                        <th>${t('priceList.variance')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        `;
                    })() : `
                        <div class="empty-state">
                            <div class="empty-state-icon">📋</div>
                            <h3>${t('priceList.noPrices')}</h3>
                            <p>${t('priceList.addServicesToGenerate')}</p>
                        </div>
                    `}
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;background:#f0f9ff;border-color:#7dd3fc;">
                <div class="card-header" style="background:#e0f2fe;">
                    <h3 class="card-title">📊 ${t('priceList.understandingVariance')}</h3>
                </div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
                        <div style="text-align:center;padding:1rem;">
                            <span style="background:#fef3c7;color:#b45309;padding:0.5rem 1rem;border-radius:20px;font-weight:600;">⚠️ ${t('priceList.underpricedZone')}</span>
                            <p style="margin-top:0.75rem;font-size:0.875rem;color:var(--gray-600);">
                                ${t('priceList.underpricedDesc')}
                            </p>
                        </div>
                        <div style="text-align:center;padding:1rem;">
                            <span style="background:#dcfce7;color:#15803d;padding:0.5rem 1rem;border-radius:20px;font-weight:600;">✓ ${t('priceList.optimalZone')}</span>
                            <p style="margin-top:0.75rem;font-size:0.875rem;color:var(--gray-600);">
                                ${t('priceList.optimalDesc')}
                            </p>
                        </div>
                        <div style="text-align:center;padding:1rem;">
                            <span style="background:#dbeafe;color:#1d4ed8;padding:0.5rem 1rem;border-radius:20px;font-weight:600;">💪 ${t('priceList.extraMarginZone')}</span>
                            <p style="margin-top:0.75rem;font-size:0.875rem;color:var(--gray-600);">
                                ${t('priceList.extraMarginDesc')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Subscription Status page - Show subscription info for all users
    async subscription() {
        const sub = APP.subscription || {};
        const user = APP.user || {};

        // Status display config
        const statusConfig = {
            'active': { icon: '✅', color: '#22c55e', bg: '#dcfce7', label: t('subscription.statusActive'), message: t('subscription.statusActiveMsg') },
            'trial': { icon: '🎁', color: '#f59e0b', bg: '#fef3c7', label: t('subscription.statusTrial'), message: t('subscription.statusTrialMsg') },
            'warning': { icon: '⏰', color: '#f59e0b', bg: '#fef3c7', label: t('subscription.statusWarning'), message: t('subscription.statusWarningMsg') },
            'grace_period': { icon: '⚠️', color: '#ef4444', bg: '#fee2e2', label: t('subscription.statusGrace'), message: t('subscription.statusGraceMsg') },
            'expired': { icon: '🔒', color: '#ef4444', bg: '#fee2e2', label: t('subscription.statusExpired'), message: t('subscription.statusExpiredMsg') },
            'suspended': { icon: '⏸️', color: '#6b7280', bg: '#f3f4f6', label: t('subscription.statusSuspended'), message: t('subscription.statusSuspendedMsg') }
        };

        const status = sub.is_suspended ? 'suspended' : (sub.status || 'trial');
        const config = statusConfig[status] || statusConfig['trial'];
        const daysRemaining = sub.days_remaining;
        const trialDaysLeft = sub.trial_days_remaining || 0;
        const servicesUsed = sub.services_used || 0;
        const maxTrialServices = sub.max_trial_services || 2;
        const isPermanent = sub.is_permanent;

        // Format expiry date
        let expiryText = '';
        if (isPermanent) {
            expiryText = t('subscription.neverExpires');
        } else if (sub.expires_at) {
            const expiryDate = new Date(sub.expires_at);
            expiryText = expiryDate.toLocaleDateString(i18n.currentLang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } else if (status === 'trial') {
            expiryText = trialDaysLeft > 0 ? t('subscription.daysOfLeft', {days: trialDaysLeft}) : t('subscription.trialEnded');
        } else {
            expiryText = t('subscription.notSet');
        }

        // Trial progress bar
        const trialProgressBar = status === 'trial' ? `
            <div class="subscription-card" style="margin-top:1.5rem;">
                <h3 style="margin-bottom:1rem;font-size:1rem;color:var(--gray-700);">${t('subscription.trialProgress')}</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
                    <div>
                        <div style="font-size:0.875rem;color:var(--gray-500);margin-bottom:0.5rem;">${t('subscription.timeRemaining')}</div>
                        <div style="background:var(--gray-200);border-radius:8px;height:8px;overflow:hidden;">
                            <div style="background:linear-gradient(90deg,var(--primary-500),var(--primary-400));height:100%;width:${Math.max(0, (trialDaysLeft/7)*100)}%;transition:width 0.3s;"></div>
                        </div>
                        <div style="font-size:0.875rem;color:var(--gray-600);margin-top:0.5rem;">${t('subscription.daysOfLeft', {days: trialDaysLeft})}</div>
                    </div>
                    <div>
                        <div style="font-size:0.875rem;color:var(--gray-500);margin-bottom:0.5rem;">${t('services.servicesUsedOf', {used: servicesUsed, max: maxTrialServices})}</div>
                        <div style="background:var(--gray-200);border-radius:8px;height:8px;overflow:hidden;">
                            <div style="background:linear-gradient(90deg,var(--secondary-500),var(--secondary-400));height:100%;width:${(servicesUsed/maxTrialServices)*100}%;transition:width 0.3s;"></div>
                        </div>
                        <div style="font-size:0.875rem;color:var(--gray-600);margin-top:0.5rem;">${t('subscription.servicesUsedOf', {used: servicesUsed, max: maxTrialServices})}</div>
                    </div>
                </div>
            </div>
        ` : '';

        // Days remaining card for active subscriptions
        const daysCard = (status === 'active' || status === 'warning') && !isPermanent ? `
            <div style="text-align:center;padding:1.5rem;background:var(--gray-50);border-radius:12px;margin-top:1.5rem;">
                <div style="font-size:3rem;font-weight:700;color:${status === 'warning' ? '#f59e0b' : 'var(--primary-600)'};">${daysRemaining}</div>
                <div style="font-size:0.875rem;color:var(--gray-500);">${t('subscription.daysUntilRenewal')}</div>
            </div>
        ` : '';

        return `
            <div class="page-header">
                <h2 class="page-title">${t('subscription.subscriptionStatus')}</h2>
                <p class="page-subtitle">${t('subscription.manageSubscription')}</p>
            </div>

            <!-- Status Card -->
            <div class="subscription-card" style="background:${config.bg};border:2px solid ${config.color}20;">
                <div style="display:flex;align-items:center;gap:1rem;">
                    <div style="font-size:3rem;">${config.icon}</div>
                    <div style="flex:1;">
                        <div style="font-size:1.5rem;font-weight:700;color:${config.color};">${config.label}</div>
                        <div style="color:var(--gray-600);margin-top:0.25rem;">${config.message}</div>
                    </div>
                    ${!isPermanent && (status === 'trial' || status === 'expired' || status === 'grace_period') ? `
                        <button class="btn btn-primary" onclick="APP.loadPage('price-list')" style="background:${config.color};">
                            ${status === 'trial' ? t('services.upgradeNow') : t('subscription.renewNow')}
                        </button>
                    ` : ''}
                </div>
            </div>

            ${trialProgressBar}
            ${daysCard}

            <!-- Subscription Details -->
            <div class="subscription-card" style="margin-top:1.5rem;">
                <h3 style="margin-bottom:1.25rem;font-size:1.125rem;color:var(--gray-800);">${t('subscription.subscriptionDetails')}</h3>
                <div class="subscription-details-grid">
                    <div class="subscription-detail-item">
                        <span class="detail-label">${t('subscription.clinic')}</span>
                        <span class="detail-value">${user.clinic_name || 'N/A'}</span>
                    </div>
                    <div class="subscription-detail-item">
                        <span class="detail-label">${t('subscription.plan')}</span>
                        <span class="detail-value">${isPermanent ? t('subscription.enterprise') : (status === 'trial' ? t('subscription.freeTrial') : t('subscription.dentalPricingPro'))}</span>
                    </div>
                    <div class="subscription-detail-item">
                        <span class="detail-label">${status === 'trial' ? t('subscription.trialEnds') : (isPermanent ? t('subscription.expiry') : t('subscription.renewalDate'))}</span>
                        <span class="detail-value">${expiryText}</span>
                    </div>
                    <div class="subscription-detail-item">
                        <span class="detail-label">${t('common.status')}</span>
                        <span class="detail-value" style="color:${config.color};font-weight:600;">${config.label}</span>
                    </div>
                </div>
            </div>

            <!-- What's Included -->
            <div class="subscription-card" style="margin-top:1.5rem;">
                <h3 style="margin-bottom:1.25rem;font-size:1.125rem;color:var(--gray-800);">${t('subscription.whatsIncluded')}</h3>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
                    <div class="feature-item ${status === 'trial' ? 'feature-limited' : ''}">
                        <span class="feature-icon">${status === 'trial' ? '🔢' : '✅'}</span>
                        <span>${status === 'trial' ? t('subscription.upToServices', {max: maxTrialServices}) : t('subscription.unlimitedServicesLabel')}</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">✅</span>
                        <span>${t('subscription.unlimitedConsumables')}</span>
                    </div>
                    <div class="feature-item ${status === 'trial' || status === 'expired' ? 'feature-locked' : ''}">
                        <span class="feature-icon">${status === 'trial' || status === 'expired' ? '🔒' : '✅'}</span>
                        <span>${t('subscription.priceCalculations')}</span>
                    </div>
                    <div class="feature-item ${status === 'trial' || status === 'expired' ? 'feature-locked' : ''}">
                        <span class="feature-icon">${status === 'trial' || status === 'expired' ? '🔒' : '✅'}</span>
                        <span>${t('subscription.priceListExportLabel')}</span>
                    </div>
                    <div class="feature-item ${status === 'trial' || status === 'expired' ? 'feature-locked' : ''}">
                        <span class="feature-icon">${status === 'trial' || status === 'expired' ? '🔒' : '✅'}</span>
                        <span>${t('subscription.varianceAnalysis')}</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">✅</span>
                        <span>${t('subscription.allClinicSettings')}</span>
                    </div>
                </div>
            </div>

            <!-- Contact Support -->
            <div class="subscription-card" style="margin-top:1.5rem;background:var(--gray-50);">
                <div style="display:flex;align-items:center;gap:1rem;">
                    <div style="font-size:2rem;">💬</div>
                    <div style="flex:1;">
                        <h4 style="font-size:1rem;color:var(--gray-800);margin-bottom:0.25rem;">Need Help?</h4>
                        <p style="font-size:0.875rem;color:var(--gray-600);margin:0;">Contact our team for subscription questions, upgrades, or support.</p>
                    </div>
                </div>
            </div>
        `;
    },

    // Super Admin page - Manage all clinics
    async superAdmin() {
        const stats = await API.get('/api/super-admin/stats');
        const clinics = await API.get('/api/super-admin/clinics');

        const statusBadge = (status) => {
            const badges = {
                'active': `<span class="badge badge-success">${t('superAdmin.active')}</span>`,
                'trial': `<span class="badge badge-warning">${t('superAdmin.trial')}</span>`,
                'grace_period': `<span class="badge badge-danger">${t('superAdmin.gracePeriod')}</span>`,
                'expired': `<span class="badge badge-danger">${t('superAdmin.expired')}</span>`,
                'unknown': '<span class="badge badge-secondary">Unknown</span>'
            };
            return badges[status] || badges['unknown'];
        };

        const activeBadge = (isActive) => {
            return isActive ? `<span class="badge badge-success">${t('common.active')}</span>` : `<span class="badge badge-danger">${t('common.inactive')}</span>`;
        };

        return `
            <!-- Stats Cards -->
            <div class="metrics-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:1.5rem;">
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: var(--primary-100); color: var(--primary-600);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 21h18M9 8h1m-1 4h1m-1 4h1M15 8h1m-1 4h1m-1 4h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
                            </svg>
                        </span>
                        <span class="metric-label">${t('superAdmin.totalClinics')}</span>
                    </div>
                    <div class="metric-value">${stats.total_clinics}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('superAdmin.registeredClinics')}</span>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #d1fae5; color: var(--success);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </span>
                        <span class="metric-label">${t('superAdmin.activeClinics')}</span>
                    </div>
                    <div class="metric-value" style="color: var(--success);">${stats.active_subscriptions}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('superAdmin.payingCustomers')}</span>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #fef3c7; color: var(--warning);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                            </svg>
                        </span>
                        <span class="metric-label">${t('superAdmin.trialClinics')}</span>
                    </div>
                    <div class="metric-value">${stats.trial_clinics}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('superAdmin.inTrialPeriod')}</span>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #fee2e2; color: var(--danger);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                            </svg>
                        </span>
                        <span class="metric-label">${t('superAdmin.expired')}</span>
                    </div>
                    <div class="metric-value" style="color: var(--danger);">${stats.expired_clinics}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('superAdmin.needsRenewal')}</span>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-icon" style="background: #dbeafe; color: var(--primary-600);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                            </svg>
                        </span>
                        <span class="metric-label">${t('superAdmin.monthlyRevenue')}</span>
                    </div>
                    <div class="metric-value currency">${formatCurrency(stats.monthly_revenue)}</div>
                    <div class="metric-footer">
                        <span class="metric-subtext">${t('superAdmin.recurringIncome')}</span>
                    </div>
                </div>
            </div>

            <!-- Clinics Table -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">${t('superAdmin.allClinics')}</h3>
                </div>
                <div class="card-body" style="padding:0;">
                    ${clinics.length > 0 ? `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Clinic Name</th>
                                    <th>Status</th>
                                    <th>Subscription</th>
                                    <th>Expires</th>
                                    <th>Days Left</th>
                                    <th>Users</th>
                                    <th>Services</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${clinics.filter(c => c.id !== 1).map(c => {
                                    const sub = c.subscription_info || {};
                                    const daysClass = sub.days_remaining > 7 ? 'color:#22c55e' :
                                                      sub.days_remaining > 0 ? 'color:#f59e0b' : 'color:#ef4444';
                                    return `
                                        <tr>
                                            <td>
                                                <strong>${c.name}</strong>
                                                <div style="font-size:0.75rem;color:var(--gray-500);">${c.email || 'No email'}</div>
                                            </td>
                                            <td>${activeBadge(c.is_active)}</td>
                                            <td>${statusBadge(sub.status)}</td>
                                            <td>${sub.expires_at || '-'}</td>
                                            <td style="${daysClass};font-weight:600;">${sub.days_remaining !== null ? sub.days_remaining : '-'}</td>
                                            <td>${c.user_count || 0}</td>
                                            <td>${c.service_count || 0}</td>
                                            <td>
                                                <button class="btn btn-sm btn-ghost" onclick="Pages.toggleClinicStatus(${c.id})" title="${c.is_active ? 'Deactivate' : 'Activate'}">
                                                    ${c.is_active ? '🔒' : '🔓'}
                                                </button>
                                                <button class="btn btn-sm btn-ghost" onclick="Pages.showEditSubscription(${c.id})" title="Edit Subscription">✏️</button>
                                                <button class="btn btn-sm btn-ghost" onclick="Pages.showPaymentForm(${c.id}, '${c.name}')" title="Record Payment">💳</button>
                                                <button class="btn btn-sm btn-ghost" onclick="Pages.showExtendSubscription(${c.id}, '${c.name}', '${sub.expires_at || ''}')" title="Extend Subscription">📅</button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">🏢</div>
                            <h3>No Clinics</h3>
                            <p>No clinics have registered yet</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    // Super Admin: Toggle clinic status
    async toggleClinicStatus(clinicId) {
        if (!confirm('Are you sure you want to toggle this clinic\'s status?')) return;
        try {
            await API.put(`/api/super-admin/clinics/${clinicId}/toggle-status`);
            showToast('Clinic status updated');
            APP.loadPage('super-admin');
        } catch(err) {
            showToast(err.message, 'error');
        }
    },

    // Super Admin: Show payment form
    showPaymentForm(clinicId, clinicName) {
        const today = new Date().toISOString().split('T')[0];
        const content = `
            <form id="paymentForm">
                <p style="margin-bottom:1rem;color:var(--gray-600);">Recording payment for <strong>${clinicName}</strong></p>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">Amount</label>
                        <input type="number" class="form-input" name="amount" placeholder="e.g., 1000" required step="0.01">
                    </div>
                    <div class="form-group">
                        <label class="form-label required">Months</label>
                        <input type="number" class="form-input" name="months_paid" value="1" min="1" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">Payment Date</label>
                        <input type="date" class="form-input" name="payment_date" value="${today}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label required">Payment Method</label>
                        <select class="form-select" name="payment_method" required>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="check">Check</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Receipt Number</label>
                    <input type="text" class="form-input" name="receipt_number" placeholder="Optional">
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-input" name="payment_notes" rows="2" placeholder="Optional notes"></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Record Payment</button>
                </div>
            </form>
        `;

        openModal('Record Payment', content);

        document.getElementById('paymentForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);

            try {
                const result = await API.post(`/api/super-admin/clinics/${clinicId}/payments`, data);
                closeAllModals();
                showToast(`Payment recorded. New expiry: ${result.new_expiry}`);
                APP.loadPage('super-admin');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    // Super Admin: Show extend subscription form
    showExtendSubscription(clinicId, clinicName, currentExpiry) {
        const content = `
            <form id="extendForm">
                <p style="margin-bottom:1rem;color:var(--gray-600);">Extending subscription for <strong>${clinicName}</strong></p>
                <p style="margin-bottom:1rem;font-size:0.875rem;">Current expiry: <strong>${currentExpiry || 'Not set'}</strong></p>

                <div class="form-group">
                    <label class="form-label">Quick Extend</label>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('extendMonths').value='1'">+1 Month</button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('extendMonths').value='3'">+3 Months</button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('extendMonths').value='6'">+6 Months</button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('extendMonths').value='12'">+1 Year</button>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label required">Months to Add</label>
                    <input type="number" class="form-input" id="extendMonths" name="extend_months" value="1" min="1" required>
                </div>

                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                        <input type="checkbox" name="start_from_today" value="1">
                        <span>Start from today (ignore current expiry)</span>
                    </label>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Extend</button>
                </div>
            </form>
        `;

        openModal('Extend Subscription', content);

        document.getElementById('extendForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const months = parseInt(formData.get('extend_months'));
            const startFromToday = formData.get('start_from_today') === '1';

            // Calculate new expiry date
            let baseDate = new Date();
            if (!startFromToday) {
                // Get current expiry from API
                const clinic = await API.get(`/api/super-admin/clinics/${clinicId}`);
                if (clinic.subscription_expires_at) {
                    const expiryDate = new Date(clinic.subscription_expires_at);
                    if (expiryDate > baseDate) {
                        baseDate = expiryDate;
                    }
                }
            }

            // Add months
            const newExpiry = new Date(baseDate);
            newExpiry.setDate(newExpiry.getDate() + (months * 30));
            const expiryStr = newExpiry.toISOString().split('T')[0];

            try {
                await API.put(`/api/super-admin/clinics/${clinicId}/subscription`, {
                    subscription_status: 'active',
                    subscription_expires_at: expiryStr
                });
                closeAllModals();
                showToast(`Subscription extended to ${expiryStr}`);
                APP.loadPage('super-admin');
            } catch(err) {
                showToast(err.message, 'error');
            }
        };
    },

    // Super Admin: Show edit subscription form with full control
    async showEditSubscription(clinicId) {
        try {
            const clinic = await API.get(`/api/super-admin/clinics/${clinicId}`);
            const sub = clinic.subscription_info || {};

            const content = `
                <form id="editSubscriptionForm">
                    <p style="margin-bottom:1rem;color:var(--gray-600);">Editing subscription for <strong>${clinic.name}</strong></p>

                    <div class="form-group">
                        <label class="form-label required">Subscription Status</label>
                        <select class="form-select" name="subscription_status" required>
                            <option value="trial" ${clinic.subscription_status === 'trial' ? 'selected' : ''}>Trial (7 days, 2 services limit)</option>
                            <option value="active" ${clinic.subscription_status === 'active' ? 'selected' : ''}>Active (Full access)</option>
                            <option value="expired" ${clinic.subscription_status === 'expired' ? 'selected' : ''}>Expired (Locked out)</option>
                        </select>
                        <span class="form-hint">Trial: limited to 2 services. Active: full access until expiry. Expired: no access.</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Subscription Expires At</label>
                        <input type="date" class="form-input" name="subscription_expires_at" value="${clinic.subscription_expires_at || ''}">
                        <span class="form-hint">Leave empty for trial accounts (will use 7-day trial from registration).</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Grace Period Start</label>
                        <input type="date" class="form-input" name="grace_period_start" value="${clinic.grace_period_start || ''}">
                        <span class="form-hint">When set, clinic enters read-only mode for 3 days before full lockout. Leave empty for no grace period.</span>
                    </div>

                    <div class="form-group">
                        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                            <input type="checkbox" name="is_active" value="1" ${clinic.is_active ? 'checked' : ''}>
                            <span>Clinic Active (can be deactivated by admin)</span>
                        </label>
                        <span class="form-hint">Unchecking this will suspend the clinic immediately, regardless of subscription status.</span>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            `;

            openModal('Edit Subscription', content);

            document.getElementById('editSubscriptionForm').onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);

                const data = {
                    subscription_status: formData.get('subscription_status'),
                    subscription_expires_at: formData.get('subscription_expires_at') || null,
                    grace_period_start: formData.get('grace_period_start') || null,
                    is_active: formData.get('is_active') === '1' ? 1 : 0
                };

                try {
                    await API.put(`/api/super-admin/clinics/${clinicId}/subscription`, data);
                    closeAllModals();
                    showToast('Subscription updated successfully');
                    APP.loadPage('super-admin');
                } catch(err) {
                    showToast(err.message, 'error');
                }
            };
        } catch(err) {
            showToast(err.message, 'error');
        }
    }
};

// Initialize app when loaded
window.addEventListener('DOMContentLoaded', () => APP.init());
