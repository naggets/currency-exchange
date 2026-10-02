const STORAGE_KEY = 'currencyCalculator.v2';
const { parseNumber, convert, withdrawal } = Conversion;
const byId = id => document.getElementById(id);
let sourceIndex = 0;
let sourceValue = '';
let amountInputs = [];
let saveTimer;

function loadSettings() {
    const defaults = { names: ['RUB', 'KGS', 'USD', 'JPY'], rates: ['0.95', String(1 / 87), '148.5'], atmEnabled: false, atmCurrency: 3, atmPercent: '0', atmMode: 'withdrawal' };
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved && Array.isArray(saved.names) && saved.names.length >= 2 && saved.names.length <= 10 && saved.names.every(name => typeof name === 'string') && Array.isArray(saved.rates) && saved.rates.length === saved.names.length - 1 && saved.rates.every(rate => typeof rate === 'string')) {
            return { ...defaults, ...saved, atmCurrency: Number.isInteger(saved.atmCurrency) && saved.atmCurrency >= 0 && saved.atmCurrency < saved.names.length ? saved.atmCurrency : saved.names.length - 1,
                atmPercent: typeof saved.atmPercent === 'string' ? saved.atmPercent : '0', atmMode: saved.atmMode === 'budget' ? 'budget' : 'withdrawal' };
        }
        // Migrate the old inverse KGS/USD quote without changing the user's chain.
        ['rubKgsBuy', 'usdKgsSell', 'usdJpyBuy'].forEach((key, i) => {
            const rate = parseNumber(localStorage.getItem(key) || '');
            if (rate > 0 && Number.isFinite(rate)) defaults.rates[i] = String(i === 1 ? 1 / rate : rate);
        });
    } catch (error) { /* The calculator works even without storage. */ }
    return defaults;
}
const settings = loadSettings();
function saveSettings() {
    const indicator = byId('save-indicator');
    clearTimeout(saveTimer);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        indicator.textContent = '✓ Настройки сохранены';
        indicator.classList.add('show');
        saveTimer = setTimeout(() => indicator.classList.remove('show'), 2000);
    } catch (error) {
        indicator.textContent = 'Не удалось сохранить настройки в браузере';
        indicator.classList.add('show');
    }
}
function nameAt(index) { return settings.names[index].trim() || `Валюта ${index + 1}`; }
function makeInput(id, value, className) {
    const input = document.createElement('input');
    Object.assign(input, { id, type: 'text', value, className });
    return input;
}
function renderChain() {
    ['currency-settings', 'rate-settings', 'currency-amounts', 'atm-currency'].forEach(id => byId(id).replaceChildren());
    amountInputs = [];
    settings.names.forEach((name, index) => {
        const row = document.createElement('div');
        row.className = 'name-row';
        const label = document.createElement('label');
        label.htmlFor = `name-${index}`;
        label.textContent = `Валюта ${index + 1}`;
        const input = makeInput(label.htmlFor, name, 'rate-input');
        input.maxLength = 24;
        input.addEventListener('input', () => { settings.names[index] = input.value; updateLabels(); saveSettings(); });
        row.append(label, input);
        byId('currency-settings').append(row);
        const amountRow = document.createElement('div');
        amountRow.className = 'currency-row';
        const amountLabel = document.createElement('label');
        amountLabel.htmlFor = `amount-${index}`;
        amountLabel.className = 'currency-label';
        const amountInput = makeInput(amountLabel.htmlFor, index === sourceIndex ? sourceValue : '', 'currency-input');
        amountInput.inputMode = 'decimal';
        amountInput.placeholder = '0.00';
        amountInput.addEventListener('input', () => { sourceIndex = index; sourceValue = amountInput.value; recalculate(); });
        amountRow.append(amountLabel, amountInput);
        amountInputs.push(amountInput);
        byId('currency-amounts').append(amountRow);
        const option = document.createElement('option');
        option.value = index;
        byId('atm-currency').append(option);
    });
    settings.rates.forEach((rate, index) => {
        const row = document.createElement('div');
        row.className = 'rate-row';
        const label = document.createElement('label');
        label.className = 'rate-label';
        label.htmlFor = `rate-${index}`;
        const input = makeInput(label.htmlFor, rate, 'rate-input');
        input.inputMode = 'decimal';
        input.placeholder = 'Введите курс';
        input.addEventListener('input', () => { settings.rates[index] = input.value; saveSettings(); recalculate(); });
        row.append(label, input);
        byId('rate-settings').append(row);
    });
    byId('atm-currency').value = settings.atmCurrency;
    byId('add-currency').disabled = settings.names.length >= 10;
    byId('remove-currency').disabled = settings.names.length <= 2;
    updateLabels();
}
function updateLabels() {
    settings.names.forEach((_, i) => {
        document.querySelector(`label[for="amount-${i}"]`).textContent = nameAt(i);
        byId('atm-currency').options[i].textContent = nameAt(i);
    });
    settings.rates.forEach((_, i) => {
        document.querySelector(`label[for="rate-${i}"]`).textContent = `1 ${nameAt(i)} = … ${nameAt(i + 1)}`;
    });
    recalculate();
}
function recalculate() {
    const rates = settings.rates.map(parseNumber);
    const result = sourceValue.trim() === '' ? null : convert(parseNumber(sourceValue), sourceIndex, rates);
    settings.rates.forEach((_, i) => byId(`rate-${i}`).setAttribute('aria-invalid', String(!Number.isFinite(rates[i]) || rates[i] <= 0)));
    byId('calculation-error').textContent = sourceValue.trim() && !result ? 'Введите неотрицательную сумму и положительные курсы для всех пар.' : '';
    amountInputs.forEach((input, i) => {
        input.classList.toggle('source-amount', i === sourceIndex && sourceValue !== '');
        if (i !== sourceIndex) input.value = result ? result[i].toFixed(2) : '';
    });
    renderAtm(result, rates);
}
function renderAtm(amounts, rates) {
    byId('atm-settings').hidden = !settings.atmEnabled;
    const output = byId('atm-result');
    output.replaceChildren();
    if (!settings.atmEnabled) return;
    const percent = parseNumber(settings.atmPercent);
    byId('atm-percent').setAttribute('aria-invalid', String(!Number.isFinite(percent) || percent < 0));
    if (!Number.isFinite(percent) || percent < 0) { output.textContent = 'Введите комиссию от 0%.'; return; }
    if (!amounts) { output.textContent = 'Введите сумму и курсы для расчёта снятия.'; return; }
    const index = settings.atmCurrency;
    const result = withdrawal(amounts[index], percent, settings.atmMode);
    const costs = result && convert(result.debit, index, rates);
    if (!result || !costs) { output.textContent = 'Сумма слишком велика для расчёта.'; return; }
    [`Наличные: ${result.cash.toFixed(2)} ${nameAt(index)}`, `Комиссия: ${result.fee.toFixed(2)} ${nameAt(index)}`,
        `Всего спишется: ${result.debit.toFixed(2)} ${nameAt(index)}`,
        `Стоимость по цепочке: ${costs.map((value, i) => `${value.toFixed(2)} ${nameAt(i)}`).join(' → ')}`
    ].forEach(text => { const line = document.createElement('p'); line.textContent = text; output.append(line); });
}
byId('toggle-rates').addEventListener('click', () => {
    const content = byId('rates-content');
    content.hidden = !content.hidden;
    byId('toggle-rates').textContent = content.hidden ? 'Развернуть' : 'Свернуть';
    byId('toggle-rates').setAttribute('aria-expanded', String(!content.hidden));
});
byId('add-currency').addEventListener('click', () => {
    if (settings.names.length >= 10) return;
    settings.names.push(`Валюта ${settings.names.length + 1}`);
    settings.rates.push('');
    renderChain(); saveSettings();
});
byId('remove-currency').addEventListener('click', () => {
    if (settings.names.length <= 2) return;
    settings.names.pop(); settings.rates.pop();
    settings.atmCurrency = Math.min(settings.atmCurrency, settings.names.length - 1);
    if (sourceIndex >= settings.names.length) { sourceIndex = 0; sourceValue = ''; }
    renderChain(); saveSettings();
});
byId('serbia-preset').addEventListener('click', () => {
    settings.names = ['RUB', 'KGS', 'RSD', 'EUR'];
    settings.rates = ['', '', ''];
    settings.atmCurrency = 2; sourceIndex = 0; sourceValue = '';
    renderChain(); saveSettings();
});
byId('atm-enabled').checked = settings.atmEnabled;
byId('atm-percent').value = settings.atmPercent;
byId('atm-mode').value = settings.atmMode;
['atm-enabled', 'atm-currency', 'atm-percent', 'atm-mode'].forEach(id => {
    byId(id).addEventListener(id === 'atm-percent' ? 'input' : 'change', () => {
        settings.atmEnabled = byId('atm-enabled').checked;
        settings.atmCurrency = Number(byId('atm-currency').value);
        settings.atmPercent = byId('atm-percent').value;
        settings.atmMode = byId('atm-mode').value;
        saveSettings(); recalculate();
    });
});
renderChain();
