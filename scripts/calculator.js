const STORAGE_KEY = 'currencyCalculator.v2';
const { parseNumber, convert, withdrawal, effectiveRate } = Conversion;
const byId = id => document.getElementById(id);
let sourceIndex = 0;
let sourceValue = '';
let amountInputs = [];
let saveTimer;
let rateFeed = null;

function loadSettings() {
    const defaults = { names: ['RUB', 'KGS', 'USD', 'RSD', 'EUR'], rates: ['', '', '', ''], pairs: [{source:'multi'}, {source:'bakai'}, {source:'visa',fee:'1.5'}, {inverse:true}], atmEnabled: false, atmCurrency: 3, atmPercent: '0', atmMode: 'withdrawal' };
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved && Array.isArray(saved.names) && saved.names.length >= 2 && saved.names.length <= 10 && saved.names.every(name => typeof name === 'string') && Array.isArray(saved.rates) && saved.rates.length === saved.names.length - 1 && saved.rates.every(rate => typeof rate === 'string')) {
            return { ...defaults, ...saved, pairs: Array.isArray(saved.pairs) ? saved.pairs : [], atmCurrency: Number.isInteger(saved.atmCurrency) && saved.atmCurrency >= 0 && saved.atmCurrency < saved.names.length ? saved.atmCurrency : saved.names.length - 1,
                atmPercent: typeof saved.atmPercent === 'string' ? saved.atmPercent : '0', atmMode: saved.atmMode === 'budget' ? 'budget' : 'withdrawal' };
        }
        // Migrate the old inverse KGS/USD quote without changing the user's chain.
        const legacyKeys = ['rubKgsBuy', 'usdKgsSell', 'usdJpyBuy'];
        if (legacyKeys.some(key => localStorage.getItem(key))) {
            defaults.names = ['RUB', 'KGS', 'USD', 'JPY']; defaults.rates = ['0.95', String(1 / 87), '148.5']; defaults.pairs = [];
        }
        legacyKeys.forEach((key, i) => {
            const rate = parseNumber(localStorage.getItem(key) || '');
            if (rate > 0 && Number.isFinite(rate)) defaults.rates[i] = String(i === 1 ? 1 / rate : rate);
        });
    } catch (error) { /* The calculator works even without storage. */ }
    return defaults;
}
const settings = loadSettings();
function normalizePairs() {
    settings.pairs = settings.rates.map((_, i) => {
        const pair = settings.pairs?.[i] || {};
        return { source: RateSources.sources[pair.source] ? pair.source : 'manual',
            inverse: pair.inverse === true, fee: typeof pair.fee === 'string' ? pair.fee : '0',
            feeMode: ['surcharge', 'withhold', 'embedded'].includes(pair.feeMode) ? pair.feeMode : 'surcharge' };
    });
}
normalizePairs();
function codeAt(i) { return settings.names[i].trim().toUpperCase(); }
function pairQuote(i) {
    const pair = settings.pairs[i];
    if (pair.source === 'manual') return { value: settings.rates[i], inverse: pair.inverse };
    const result = RateSources.lookup(rateFeed, pair.source, codeAt(i), codeAt(i + 1));
    return result.quote ? { value: String(result.quote.rate), inverse: false, quote: result.quote } : { error: result.error, value: '' };
}
function calculatedRates() {
    return settings.rates.map((_, i) => {
        const quote = pairQuote(i);
        const pair = settings.pairs[i];
        return effectiveRate(quote.value, quote.inverse, pair.fee, pair.feeMode);
    });
}
function makeSelect(id, choices, value) {
    const select = document.createElement('select');
    select.id = id;
    select.className = 'rate-input';
    choices.forEach(([key, name]) => { const option = document.createElement('option'); option.value = key; option.textContent = name; select.append(option); });
    select.value = value;
    return select;
}
function addField(container, text, control) {
    const label = document.createElement('label');
    label.htmlFor = control.id;
    label.textContent = text;
    container.append(label, control);
}
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
    normalizePairs();
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
        input.setAttribute('list', 'visa-currencies');
        input.title = 'Для автокурса используйте код валюты: USD, JPY, RSD, EUR и другие.';
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
        const reference = document.createElement('p');
        reference.id = `reference-${index}`;
        reference.className = 'amount-reference';
        amountInput.setAttribute('aria-describedby', reference.id);
        const amountGroup = document.createElement('div');
        amountGroup.className = 'amount-group';
        amountGroup.append(amountInput, reference);
        amountRow.append(amountGroup);
        amountInputs.push(amountInput);
        byId('currency-amounts').append(amountRow);
        const option = document.createElement('option');
        option.value = index;
        byId('atm-currency').append(option);
    });
    settings.rates.forEach((rate, index) => {
        const row = document.createElement('div');
        row.className = 'pair-card';
        const pair = settings.pairs[index];
        const source = makeSelect(`source-${index}`, Object.entries(RateSources.sources).map(([key, item]) => [key, item.name]), pair.source);
        addField(row, 'Источник курса', source);
        source.addEventListener('change', () => {
            pair.source = source.value;
            if (pair.source === 'manual') byId(`rate-${index}`).value = settings.rates[index];
            saveSettings(); updateLabels();
        });
        const direction = makeSelect(`direction-${index}`, [['direct', 'Прямая котировка'], ['inverse', 'Обратная котировка']], pair.inverse ? 'inverse' : 'direct');
        addField(row, 'Как указан курс', direction);
        direction.addEventListener('change', () => { pair.inverse = direction.value === 'inverse'; saveSettings(); updateLabels(); });
        const label = document.createElement('label');
        label.className = 'rate-label';
        label.htmlFor = `rate-${index}`;
        const input = makeInput(label.htmlFor, rate, 'rate-input');
        input.inputMode = 'decimal';
        input.placeholder = 'Введите курс';
        input.setAttribute('aria-describedby', `pair-info-${index}`);
        input.addEventListener('input', () => { settings.rates[index] = input.value; saveSettings(); recalculate(); });
        row.append(label, input);
        const fee = makeInput(`fee-${index}`, pair.fee, 'rate-input');
        fee.inputMode = 'decimal';
        addField(row, 'Комиссия пары, % (например, OIF)', fee);
        fee.addEventListener('input', () => { pair.fee = fee.value; saveSettings(); recalculate(); });
        const feeMode = makeSelect(`fee-mode-${index}`, [['surcharge', 'Сверх суммы · 100 + 1,5% = 101,5'], ['withhold', 'Удержание · 100 − 1,5% = 98,5'], ['embedded', 'Уже включена в курс · повторно не добавлять']], pair.feeMode);
        addField(row, 'Как учитывается комиссия', feeMode);
        feeMode.addEventListener('change', () => { pair.feeMode = feeMode.value; saveSettings(); recalculate(); });
        const info = document.createElement('div');
        info.id = `pair-info-${index}`;
        info.className = 'pair-info';
        row.append(info);
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
        const pair = settings.pairs[i];
        const inverse = pair.source === 'manual' && pair.inverse;
        document.querySelector(`label[for="rate-${i}"]`).textContent = `1 ${nameAt(inverse ? i + 1 : i)} = … ${nameAt(inverse ? i : i + 1)}`;
        byId(`direction-${i}`).disabled = pair.source !== 'manual';
        byId(`rate-${i}`).readOnly = pair.source !== 'manual';
    });
    recalculate();
}
function recalculate() {
    const rates = calculatedRates();
    const result = sourceValue.trim() === '' ? null : convert(parseNumber(sourceValue), sourceIndex, rates);
    settings.rates.forEach((_, i) => {
        byId(`rate-${i}`).setAttribute('aria-invalid', String(!Number.isFinite(rates[i]) || rates[i] <= 0));
        const fee = parseNumber(settings.pairs[i].fee);
        byId(`fee-${i}`).setAttribute('aria-invalid', String(!Number.isFinite(fee) || fee < 0 || (settings.pairs[i].feeMode === 'withhold' && fee >= 100)));
        renderPairInfo(i, rates[i]);
    });
    byId('calculation-error').textContent = sourceValue.trim() && !result ? 'Проверьте сумму, курсы, комиссии и доступность выбранных источников.' : '';
    amountInputs.forEach((input, i) => {
        input.classList.toggle('source-amount', i === sourceIndex && sourceValue !== '');
        if (i !== sourceIndex) input.value = result ? result[i].toFixed(2) : '';
        const unit = convert(1, sourceIndex, rates);
        byId(`reference-${i}`).textContent = unit ? (i === sourceIndex ? 'Исходная сумма · сохранится при обновлении курсов' : `С учётом комиссий: 1 ${nameAt(sourceIndex)} = ${formatRate(unit[i])} ${nameAt(i)}`) : 'Укажите курсы для всей цепочки';
    });
    renderAtm(result, rates);
}
function formatRate(value) { return Number(value.toPrecision(10)).toString(); }
function renderPairInfo(i, rate) {
    const pair = settings.pairs[i];
    const item = pairQuote(i);
    const output = byId(`pair-info-${i}`);
    output.replaceChildren();
    if (pair.source !== 'manual') byId(`rate-${i}`).value = item.quote ? formatRate(item.quote.rate) : '';
    const line = text => { const p = document.createElement('p'); p.textContent = text; output.append(p); };
    if (item.error) line(item.error);
    else {
        const base = effectiveRate(item.value, item.inverse, '0');
        if (Number.isFinite(base)) {
            line(`Без комиссии: 1 ${nameAt(i)} = ${formatRate(base)} ${nameAt(i + 1)} · 1 ${nameAt(i + 1)} = ${formatRate(1 / base)} ${nameAt(i)}`);
            if (Number.isFinite(rate) && rate > 0) line(`С учётом комиссии: 1 ${nameAt(i)} = ${formatRate(rate)} ${nameAt(i + 1)}`);
        }
    }
    if (item.quote) {
        line(`Получено: ${new Date(item.quote.fetchedAt).toLocaleString('ru-RU')}`);
        if (item.quote.publisher) line(`Поставщик данных: ${item.quote.publisher}`);
        if (item.quote.sourceDate) line(`Дата курса: ${item.quote.sourceDate}`);
        if (item.quote.sourceUpdatedAt) line(`Опубликовано: ${new Date(item.quote.sourceUpdatedAt).toLocaleString('ru-RU')}`);
        if (item.quote.sourceUpdatedAtLocal) line(`Обновлено у банка: ${item.quote.sourceUpdatedAtLocal.replace('T', ' ')} (время сайта)`);
        if (item.quote.note) line(item.quote.note);
    }
    const provider = RateSources.sources[pair.source];
    if (provider.url) {
        const link = document.createElement('a');
        Object.assign(link, { href: item.quote?.sourceUrl || provider.url, target: '_blank', rel: 'noopener', textContent: 'Открыть источник' });
        output.append(link);
    }
    if (pair.source === 'unired' || pair.source === 'multi') {
        line('Утренний снимок Curso: курс в приложении в течение дня может измениться.');
    }
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
    settings.names = ['RUB', 'KGS', 'USD', 'RSD', 'EUR'];
    settings.rates = ['', '', '', ''];
    settings.pairs = [{source:'multi'}, {source:'bakai'}, {source:'visa',fee:'1.5'}, {inverse:true}];
    settings.atmCurrency = 3; sourceIndex = 0; sourceValue = '';
    renderChain(); saveSettings();
});
byId('unired-preset').addEventListener('click', () => {
    settings.names = ['RUB', 'USD', 'RSD', 'EUR'];
    settings.rates = ['', '', ''];
    settings.pairs = [{ source: 'unired' }, { source: 'visa', fee: '1.5' }, { inverse: true }];
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
async function refreshRates() {
    const button = byId('refresh-rates');
    button.disabled = true;
    byId('feed-status').textContent = 'Загружаю опубликованные курсы…';
    try {
        const response = await fetch(`data/rates.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('Не удалось загрузить курсы');
        const feed = await response.json();
        if (feed.schemaVersion !== 1 || !Array.isArray(feed.quotes)) throw new Error('Некорректный файл курсов');
        rateFeed = feed;
        let currencyList = byId('visa-currencies');
        if (!currencyList) { currencyList = document.createElement('datalist'); currencyList.id = 'visa-currencies'; document.body.append(currencyList); }
        currencyList.replaceChildren(...[...new Set(['USD', ...feed.quotes.filter(q => q.source === 'visa').map(q => q.to)])].sort().map(code => { const option = document.createElement('option'); option.value = code; return option; }));
        const available = feed.quotes.filter(quote => RateSources.lookup(feed, quote.source, quote.from, quote.to).quote).length;
        const failed = Object.entries(feed.providers || {}).filter(([,value]) => value.status !== 'ok').map(([key]) => RateSources.sources[key]?.name || key);
        byId('feed-status').textContent = (available ? `Доступно котировок: ${available}. Сбор по расписанию каждые 2 часа; Unired и ELQR — утренняя публикация.` : 'Свежие котировки недоступны. Используйте ручной ввод.') + (failed.length ? ` Недоступны: ${failed.join(', ')}.` : '');
    } catch (error) {
        rateFeed = null;
        byId('feed-status').textContent = 'Не удалось загрузить курсы. Ручной ввод работает без подключения.';
    } finally { button.disabled = false; recalculate(); }
}
byId('refresh-rates').addEventListener('click', refreshRates);
refreshRates();
setInterval(refreshRates, 5 * 60000);
