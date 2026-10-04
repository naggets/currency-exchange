/* Calculation helpers shared by the page and Node tests. */
(function (root) {
    function parseNumber(value) {
        const text = String(value).trim().replace(/\s/g, '').replace(',', '.');
        return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) ? Number(text) : NaN;
    }
    function convert(amount, source, rates) {
        if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(source) || source < 0 || source > rates.length || !rates.every(rate => Number.isFinite(rate) && rate > 0)) return null;
        const amounts = Array(rates.length + 1);
        amounts[source] = amount;
        for (let i = source; i < rates.length; i++) amounts[i + 1] = amounts[i] * rates[i];
        for (let i = source - 1; i >= 0; i--) amounts[i] = amounts[i + 1] / rates[i];
        return amounts.every(Number.isFinite) ? amounts : null;
    }
    function withdrawal(amount, percent, mode, minimum = 0) {
        if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(percent) || percent < 0 || !Number.isFinite(minimum) || minimum < 0) return null;
        if (amount === 0) return { cash: 0, debit: 0, fee: 0 };
        const factor = 1 + percent / 100;
        const cash = mode === 'budget' ? Math.min(amount / factor, amount - minimum) : amount;
        if (cash <= 0) return null;
        const debit = mode === 'budget' ? amount : cash + Math.max(cash * percent / 100, minimum);
        return Number.isFinite(debit) ? { cash, debit, fee: debit - cash } : null;
    }
    function convertBetween(amount, source, target, rates) {
        if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(source) || !Number.isInteger(target) || Math.min(source, target) < 0 || Math.max(source, target) > rates.length) return null;
        let result = amount;
        for (let i = Math.min(source, target); i < Math.max(source, target); i++) {
            if (!Number.isFinite(rates[i]) || rates[i] <= 0) return null;
            result = source < target ? result * rates[i] : result / rates[i];
        }
        return Number.isFinite(result) ? result : null;
    }
    function effectiveRate(value, inverse = false, percent = 0, feeMode = 'surcharge') {
        const quote = parseNumber(value);
        const fee = parseNumber(percent);
        if (!Number.isFinite(quote) || quote <= 0 || !Number.isFinite(fee) || fee < 0) return NaN;
        const base = inverse ? 1 / quote : quote;
        if (feeMode === 'embedded') return base;
        if (feeMode === 'withhold') return fee < 100 ? base * (1 - fee / 100) : NaN;
        return base / (1 + fee / 100);
    }
    const api = { parseNumber, convert, convertBetween, withdrawal, effectiveRate };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Conversion = api;
})(typeof window !== 'undefined' ? window : globalThis);
