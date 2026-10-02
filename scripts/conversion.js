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
    function withdrawal(amount, percent, mode) {
        if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(percent) || percent < 0) return null;
        const factor = 1 + percent / 100;
        const cash = mode === 'budget' ? amount / factor : amount;
        const debit = mode === 'budget' ? amount : cash * factor;
        return Number.isFinite(debit) ? { cash, debit, fee: debit - cash } : null;
    }
    const api = { parseNumber, convert, withdrawal };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Conversion = api;
})(typeof window !== 'undefined' ? window : globalThis);
