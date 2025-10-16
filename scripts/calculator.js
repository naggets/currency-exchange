/**
 * Currency Calculator
 * Multi-currency converter with custom exchange rates
 * @version 1.0.0
 */

// State management
let isCalculating = false;
let ratesCollapsed = false;

// DOM elements
const rateInputs = {
    rubKgsBuy: document.getElementById('rub-kgs-buy'),
    usdKgsSell: document.getElementById('usd-kgs-sell'),
    usdJpyBuy: document.getElementById('usd-jpy-buy')
};

const amountInputs = {
    rub: document.getElementById('amount-rub'),
    kgs: document.getElementById('amount-kgs'),
    usd: document.getElementById('amount-usd'),
    jpy: document.getElementById('amount-jpy')
};

// Constants
const STORAGE_KEYS = {
    RUB_KGS_BUY: 'rubKgsBuy',
    USD_KGS_SELL: 'usdKgsSell',
    USD_JPY_BUY: 'usdJpyBuy'
};

const DEFAULT_RATES = {
    rubKgsBuy: 0.95,
    usdKgsSell: 87.0,
    usdJpyBuy: 148.5
};

/**
 * Normalize decimal input (replace comma with dot)
 * @param {string} value - Input value
 * @returns {string} Normalized value
 */
function normalizeDecimal(value) {
    if (typeof value !== 'string') return value;
    // Replace comma with dot for parseFloat
    return value.replace(',', '.');
}

/**
 * Parse number from input (supports both comma and dot)
 * @param {string} value - Input value
 * @returns {number} Parsed number
 */
function parseNumber(value) {
    if (!value) return 0;
    const normalized = normalizeDecimal(value);
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Load saved rates from localStorage
 * @returns {Object} Rates object
 */
function loadRates() {
    const rates = {
        rubKgsBuy: parseFloat(localStorage.getItem(STORAGE_KEYS.RUB_KGS_BUY)) || DEFAULT_RATES.rubKgsBuy,
        usdKgsSell: parseFloat(localStorage.getItem(STORAGE_KEYS.USD_KGS_SELL)) || DEFAULT_RATES.usdKgsSell,
        usdJpyBuy: parseFloat(localStorage.getItem(STORAGE_KEYS.USD_JPY_BUY)) || DEFAULT_RATES.usdJpyBuy
    };
    
    rateInputs.rubKgsBuy.value = rates.rubKgsBuy;
    rateInputs.usdKgsSell.value = rates.usdKgsSell;
    rateInputs.usdJpyBuy.value = rates.usdJpyBuy;
    
    return rates;
}

/**
 * Save rates to localStorage
 */
function saveRates() {
    try {
        localStorage.setItem(STORAGE_KEYS.RUB_KGS_BUY, rateInputs.rubKgsBuy.value);
        localStorage.setItem(STORAGE_KEYS.USD_KGS_SELL, rateInputs.usdKgsSell.value);
        localStorage.setItem(STORAGE_KEYS.USD_JPY_BUY, rateInputs.usdJpyBuy.value);
        
        showSaveIndicator();
    } catch (error) {
        console.error('Error saving rates:', error);
    }
}

/**
 * Show save indicator
 */
function showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 2000);
}

/**
 * Get current rates from inputs
 * @returns {Object} Current rates
 */
function getRates() {
    return {
        rubKgsBuy: parseNumber(rateInputs.rubKgsBuy.value),
        usdKgsSell: parseNumber(rateInputs.usdKgsSell.value),
        usdJpyBuy: parseNumber(rateInputs.usdJpyBuy.value)
    };
}

/**
 * Validate rates
 * @param {Object} rates - Rates object
 * @returns {boolean} True if all rates are valid
 */
function validateRates(rates) {
    return rates.rubKgsBuy > 0 && rates.usdKgsSell > 0 && rates.usdJpyBuy > 0;
}

/**
 * Calculate other currencies from RUB
 * @param {number} amount - Amount in RUB
 * @returns {Object} Calculated amounts
 */
function calculateFromRUB(amount) {
    const rates = getRates();
    if (!amount || amount === 0 || !validateRates(rates)) {
        return { kgs: 0, usd: 0, jpy: 0 };
    }
    
    const kgs = amount * rates.rubKgsBuy;
    const usd = kgs / rates.usdKgsSell;
    const jpy = usd * rates.usdJpyBuy;
    
    return { kgs, usd, jpy };
}

/**
 * Calculate other currencies from KGS
 * @param {number} amount - Amount in KGS
 * @returns {Object} Calculated amounts
 */
function calculateFromKGS(amount) {
    const rates = getRates();
    if (!amount || amount === 0 || !validateRates(rates)) {
        return { rub: 0, usd: 0, jpy: 0 };
    }
    
    const rub = amount / rates.rubKgsBuy;
    const usd = amount / rates.usdKgsSell;
    const jpy = usd * rates.usdJpyBuy;
    
    return { rub, usd, jpy };
}

/**
 * Calculate other currencies from USD
 * @param {number} amount - Amount in USD
 * @returns {Object} Calculated amounts
 */
function calculateFromUSD(amount) {
    const rates = getRates();
    if (!amount || amount === 0 || !validateRates(rates)) {
        return { rub: 0, kgs: 0, jpy: 0 };
    }
    
    const kgs = amount * rates.usdKgsSell;
    const rub = kgs / rates.rubKgsBuy;
    const jpy = amount * rates.usdJpyBuy;
    
    return { rub, kgs, jpy };
}

/**
 * Calculate other currencies from JPY
 * @param {number} amount - Amount in JPY
 * @returns {Object} Calculated amounts
 */
function calculateFromJPY(amount) {
    const rates = getRates();
    if (!amount || amount === 0 || !validateRates(rates)) {
        return { rub: 0, kgs: 0, usd: 0 };
    }
    
    const usd = amount / rates.usdJpyBuy;
    const kgs = usd * rates.usdKgsSell;
    const rub = kgs / rates.rubKgsBuy;
    
    return { rub, kgs, usd };
}

/**
 * Format number to 2 decimal places
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatAmount(num) {
    return num.toFixed(2);
}

/**
 * Update all currency amounts based on source input
 * @param {HTMLElement} source - Source input element
 * @param {string} value - Input value
 */
function updateAmounts(source, value) {
    if (isCalculating) return;
    isCalculating = true;
    
    const amount = parseNumber(value);
    
    if (amount === 0) {
        clearAllAmounts(source);
        isCalculating = false;
        return;
    }
    
    let results;
    
    try {
        if (source === amountInputs.rub) {
            results = calculateFromRUB(amount);
            amountInputs.kgs.value = formatAmount(results.kgs);
            amountInputs.usd.value = formatAmount(results.usd);
            amountInputs.jpy.value = formatAmount(results.jpy);
        } else if (source === amountInputs.kgs) {
            results = calculateFromKGS(amount);
            amountInputs.rub.value = formatAmount(results.rub);
            amountInputs.usd.value = formatAmount(results.usd);
            amountInputs.jpy.value = formatAmount(results.jpy);
        } else if (source === amountInputs.usd) {
            results = calculateFromUSD(amount);
            amountInputs.rub.value = formatAmount(results.rub);
            amountInputs.kgs.value = formatAmount(results.kgs);
            amountInputs.jpy.value = formatAmount(results.jpy);
        } else if (source === amountInputs.jpy) {
            results = calculateFromJPY(amount);
            amountInputs.rub.value = formatAmount(results.rub);
            amountInputs.kgs.value = formatAmount(results.kgs);
            amountInputs.usd.value = formatAmount(results.usd);
        }
    } catch (error) {
        console.error('Error calculating amounts:', error);
    }
    
    isCalculating = false;
}

/**
 * Clear all amount inputs except source
 * @param {HTMLElement} source - Source input to keep
 */
function clearAllAmounts(source) {
    Object.values(amountInputs).forEach(input => {
        if (input !== source) {
            input.value = '';
        }
    });
}

/**
 * Toggle rates section visibility
 */
function toggleRates() {
    const content = document.getElementById('rates-content');
    const btn = document.querySelector('.toggle-rates');
    ratesCollapsed = !ratesCollapsed;
    
    if (ratesCollapsed) {
        content.style.display = 'none';
        btn.textContent = 'Развернуть';
    } else {
        content.style.display = 'block';
        btn.textContent = 'Свернуть';
    }
}

/**
 * Open Visa exchange rates calculator
 */
function openVisaRates() {
    window.open('https://www.visa.com.sg/support/consumer/travel-support/exchange-rate-calculator.html', '_blank');
}

/**
 * Recalculate all amounts based on current non-empty input
 */
function recalculateAmounts() {
    if (amountInputs.rub.value) {
        updateAmounts(amountInputs.rub, amountInputs.rub.value);
    } else if (amountInputs.kgs.value) {
        updateAmounts(amountInputs.kgs, amountInputs.kgs.value);
    } else if (amountInputs.usd.value) {
        updateAmounts(amountInputs.usd, amountInputs.usd.value);
    } else if (amountInputs.jpy.value) {
        updateAmounts(amountInputs.jpy, amountInputs.jpy.value);
    }
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Rate inputs - normalize comma to dot on input
    Object.values(rateInputs).forEach(input => {
        input.addEventListener('input', (e) => {
            // Save original cursor position
            const cursorPos = e.target.selectionStart;
            const oldValue = e.target.value;
            
            // Normalize comma to dot
            const newValue = normalizeDecimal(oldValue);
            
            // Update value if changed
            if (newValue !== oldValue) {
                e.target.value = newValue;
                // Restore cursor position
                e.target.setSelectionRange(cursorPos, cursorPos);
            }
            
            saveRates();
            recalculateAmounts();
        });
    });

    // Amount inputs - normalize and calculate
    Object.values(amountInputs).forEach(input => {
        input.addEventListener('input', (e) => {
            // Save original cursor position
            const cursorPos = e.target.selectionStart;
            const oldValue = e.target.value;
            
            // Normalize comma to dot
            const newValue = normalizeDecimal(oldValue);
            
            // Update value if changed
            if (newValue !== oldValue) {
                e.target.value = newValue;
                // Restore cursor position
                e.target.setSelectionRange(cursorPos, cursorPos);
            }
            
            updateAmounts(e.target, e.target.value);
        });
    });
}

/**
 * Initialize the application
 */
function init() {
    try {
        loadRates();
        initEventListeners();
        console.log('Currency Calculator initialized successfully');
    } catch (error) {
        console.error('Error initializing calculator:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}