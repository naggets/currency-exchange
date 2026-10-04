const STORAGE_KEY = 'currencyCalculator.v2';
const { parseNumber, convert, convertBetween, withdrawal, effectiveRate } = Conversion;
const byId = id => document.getElementById(id);
let sourceIndex = 0;
let sourceValue = '';
let amountInputs = [];
let saveTimer;
let rateFeed = null;

function loadSettings() {
    const defaults = { names: ['RUB', 'KGS', 'USD', 'RSD', 'EUR'], rates: ['', '', '', ''], pairs: [{source:'multi'}, {source:'bakai'}, {source:'visa',fee:'1.5'}, {inverse:true}], atmEnabled: false, atmCurrency: 3, atmCardCurrency: 2, atmPercent: '1', atmMinimum: '3', atmAmount: '', atmMode: 'withdrawal' };
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved && Array.isArray(saved.names) && saved.names.length >= 2 && saved.names.length <= 10 && saved.names.every(name => typeof name === 'string') && Array.isArray(saved.rates) && saved.rates.length === saved.names.length - 1 && saved.rates.every(rate => typeof rate === 'string')) {
            return { ...defaults, ...saved, pairs: Array.isArray(saved.pairs) ? saved.pairs : [], atmCurrency: Number.isInteger(saved.atmCurrency) && saved.atmCurrency >= 0 && saved.atmCurrency < saved.names.length ? saved.atmCurrency : saved.names.length - 1,
                atmCardCurrency: Number.isInteger(saved.atmCardCurrency) && saved.atmCardCurrency >= 0 && saved.atmCardCurrency < saved.names.length ? saved.atmCardCurrency : Math.max(0, saved.names.findIndex(n => n.toUpperCase() === 'USD')),
                atmMinimum: typeof saved.atmMinimum === 'string' ? saved.atmMinimum : '3', atmAmount: typeof saved.atmAmount === 'string' ? saved.atmAmount : '',
                atmPercent: typeof saved.atmPercent === 'string' ? saved.atmPercent : '1', atmMode: saved.atmMode === 'budget' ? 'budget' : 'withdrawal' };
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
const currencyNames = new Intl.DisplayNames(['ru'], { type: 'currency' });
function currencyOptions() {
    const common = ['RUB', 'KGS', 'USD', 'RSD', 'EUR', 'JPY', 'GBP', 'CHF', 'CNY', 'THB', 'TRY', 'AED'];
    const codes = [...new Set([...common, ...(rateFeed?.quotes || []).filter(q => q.source === 'visa').map(q => q.to), ...settings.names.map(n => n.trim().toUpperCase())])];
    return codes.filter(Boolean).map(code => {
        let name = code;
        try { name = currencyNames.of(code); } catch (error) { /* Custom name. */ }
        return [code, name && name !== code ? `${code} · ${name}` : code];
    });
}
function suggestedPair(from, to) {
    if (from === 'RUB' && to === 'KGS') return { source: 'multi' };
    if (from === 'RUB' && to === 'USD') return { source: 'unired' };
    if ((from === 'KGS' && to === 'USD') || (from === 'USD' && to === 'KGS')) return { source: 'bakai' };
    if (from === 'USD' && (rateFeed?.quotes || []).some(q => q.source === 'visa' && q.to === to)) return { source: 'visa', fee: '1.5' };
    return { source: 'manual' };
}
function changeChain(nextNames, indexMap) {
    const oldNames = settings.names.map(n => n.trim().toUpperCase());
    const nextRates = [], nextPairs = [];
    for (let i = 0; i < nextNames.length - 1; i++) {
        const from = nextNames[i].trim().toUpperCase(), to = nextNames[i + 1].trim().toUpperCase();
        const old = oldNames.findIndex((n, j) => n === from && oldNames[j + 1] === to);
        const samePosition = indexMap[i] === i && indexMap[i + 1] === i + 1;
        // Visa settings follow the USD card when only its spending currency changes.
        const visa = samePosition && oldNames[i] === from && settings.pairs[i]?.source === 'visa' && from === 'USD';
        nextRates.push(old >= 0 ? settings.rates[old] : '');
        nextPairs.push(old >= 0 ? { ...settings.pairs[old] } : visa ? { ...settings.pairs[i] } : suggestedPair(from, to));
    }
    sourceIndex = Math.max(0, indexMap.indexOf(sourceIndex));
    settings.atmCurrency = Math.max(0, indexMap.indexOf(settings.atmCurrency));
    settings.atmCardCurrency = Math.max(0, indexMap.indexOf(settings.atmCardCurrency));
    settings.names = nextNames; settings.rates = nextRates; settings.pairs = nextPairs;
    byId('route-preset').value = 'custom';
    renderChain(); saveSettings();
}
function moveCurrency(index, offset) {
    const target = index + offset;
    if (target < 0 || target >= settings.names.length) return;
    const names = [...settings.names], indices = names.map((_, i) => i);
    [names[index], names[target]] = [names[target], names[index]];
    [indices[index], indices[target]] = [indices[target], indices[index]];
    changeChain(names, indices);
}
function renderChain() {
    normalizePairs();
    ['currency-settings', 'rate-settings', 'currency-amounts', 'atm-currency', 'atm-card-currency'].forEach(id => byId(id).replaceChildren());
    amountInputs = [];
    settings.names.forEach((name, index) => {
        const row = document.createElement('div');
        row.className = 'chain-node';
        const label = document.createElement('label');
        label.htmlFor = `name-${index}`;
        label.textContent = `Валюта ${index + 1}`;
        const input = makeSelect(label.htmlFor, [...currencyOptions(), ['__custom', 'Своя валюта…']], name.trim().toUpperCase());
        input.addEventListener('change', () => {
            if (input.value === '__custom') { custom.hidden = false; custom.focus(); return; }
            const names = [...settings.names], indices = names.map((_, i) => i);
            const existing = names.findIndex((n, i) => i !== index && n.trim().toUpperCase() === input.value);
            if (existing >= 0) {
                [names[index], names[existing]] = [names[existing], names[index]];
                [indices[index], indices[existing]] = [indices[existing], indices[index]];
            } else names[index] = input.value;
            changeChain(names, indices);
        });
        const custom = makeInput(`custom-name-${index}`, name, 'rate-input');
        custom.hidden = true; custom.maxLength = 24; custom.setAttribute('aria-label', `Своя валюта ${index + 1}`);
        custom.addEventListener('change', () => { if (!custom.value.trim()) return; const names = [...settings.names]; names[index] = custom.value.trim(); changeChain(names, names.map((_, i) => i)); });
        const controls = document.createElement('div'); controls.className = 'node-controls';
        [-1, 1].forEach(offset => { const button = document.createElement('button'); button.className = 'move-button'; button.textContent = offset < 0 ? '←' : '→'; button.setAttribute('aria-label', `Переместить ${name} ${offset < 0 ? 'влево' : 'вправо'}`); button.disabled = index + offset < 0 || index + offset >= settings.names.length; button.addEventListener('click', () => moveCurrency(index, offset)); controls.append(button); });
        row.append(label, input, custom, controls);
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
        const cardOption = document.createElement('option'); cardOption.value = index; byId('atm-card-currency').append(cardOption);
    });
    settings.rates.forEach((rate, index) => {
        const row = document.createElement('details');
        row.className = 'pair-card';
        const pair = settings.pairs[index];
        const summary = document.createElement('summary'); summary.id = `pair-summary-${index}`; row.append(summary);
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
    byId('atm-card-currency').value = settings.atmCardCurrency;
    byId('add-currency').disabled = settings.names.length >= 10;
    byId('remove-currency').disabled = settings.names.length <= 2;
    updateLabels();
}
function updateLabels() {
    settings.names.forEach((_, i) => {
        document.querySelector(`label[for="amount-${i}"]`).textContent = nameAt(i);
        byId('atm-currency').options[i].textContent = nameAt(i);
        byId('atm-card-currency').options[i].textContent = nameAt(i);
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
    const summary = byId(`pair-summary-${i}`); summary.replaceChildren();
    const title = document.createElement('span'); title.textContent = `${nameAt(i)} → ${nameAt(i + 1)}`;
    const description = document.createElement('span'); description.className = 'pair-summary-description';
    description.textContent = Number.isFinite(rate) && rate > 0 ? `1 ${nameAt(i)} = ${formatRate(rate)} ${nameAt(i + 1)} · ${pair.source === 'manual' ? 'Вручную' : RateSources.sources[pair.source].name.split(' · ')[0]}${parseNumber(pair.fee) > 0 && pair.feeMode !== 'embedded' ? ` · комиссия ${pair.fee}%` : ''}` : item.error || 'Укажите курс';
    summary.append(title, description);
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
    const output = byId('atm-result'); output.replaceChildren();
    const cashIndex = settings.atmCurrency, cardIndex = settings.atmCardCurrency;
    byId('atm-amount-label').textContent = settings.atmMode === 'budget' ? 'Бюджет на карте, ' + nameAt(cardIndex) : 'Хочу получить, ' + nameAt(cashIndex);
    byId('atm-minimum-label').textContent = 'Минимум комиссии, ' + nameAt(cardIndex);
    if (!settings.atmEnabled) return;
    const percent = parseNumber(settings.atmPercent), minimum = parseNumber(settings.atmMinimum);
    [['atm-percent', percent], ['atm-minimum', minimum]].forEach(([id, value]) => byId(id).setAttribute('aria-invalid', String(!Number.isFinite(value) || value < 0)));
    if (!Number.isFinite(percent) || percent < 0 || !Number.isFinite(minimum) || minimum < 0) { output.textContent = 'Укажите процент и минимум комиссии от нуля.'; return; }
    const amount = settings.atmAmount.trim() ? parseNumber(settings.atmAmount) : amounts?.[settings.atmMode === 'budget' ? cardIndex : cashIndex];
    if (!Number.isFinite(amount) || amount < 0) { output.textContent = 'Введите сумму наличных или бюджет карты.'; return; }
    const base = settings.atmMode === 'budget' ? amount : convertBetween(amount, cashIndex, cardIndex, rates);
    if (base === null) { output.textContent = 'Проверьте курсы между валютой наличных и валютой карты.'; return; }
    const result = withdrawal(base, percent, settings.atmMode, minimum);
    if (!result) { output.textContent = 'Бюджета недостаточно для комиссии или сумма слишком велика.'; return; }
    const cash = convertBetween(result.cash, cardIndex, cashIndex, rates);
    if (cash === null) { output.textContent = 'Проверьте курсы между валютой наличных и валютой карты.'; return; }
    const line = (label, value, strong = false) => {
        const row = document.createElement('div'); row.className = 'breakdown-row' + (strong ? ' breakdown-total' : '');
        const title = document.createElement('span'); title.textContent = label;
        const number = document.createElement('strong'); number.textContent = value; row.append(title, number); output.append(row);
    };
    const money = (value, index) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value) + ' ' + nameAt(index);
    line('Получите наличными', money(cash, cashIndex));
    line('Конвертация в валюту карты', money(result.cash, cardIndex));
    line('Комиссия за снятие · ' + percent + '% или минимум ' + minimum + ' ' + nameAt(cardIndex), money(result.fee, cardIndex));
    line('Всего спишется с карты', money(result.debit, cardIndex), true);
    const note = document.createElement('p'); note.className = 'subtitle'; note.textContent = 'Комиссии пар, включая OIF, уже учтены в конвертации. Комиссия за снятие добавлена отдельно.'; output.append(note);
    const heading = document.createElement('h3'); heading.textContent = 'Эквиваленты итогового списания'; output.append(heading);
    settings.names.forEach((_, index) => {
        if (index === cardIndex) return;
        const value = convertBetween(result.debit, cardIndex, index, rates);
        line(nameAt(index), value === null ? 'Нет курса' : money(value, index));
    });
    const explanation = document.createElement('p'); explanation.className = 'subtitle'; explanation.textContent = 'Это эквиваленты полной стоимости по цепочке. В валюте наличных показан расход вместе с комиссией, а полученная сумма — в первой строке.'; output.append(explanation);
}
byId('toggle-rates').addEventListener('click', () => {
    const content = byId('rates-content');
    content.hidden = !content.hidden;
    byId('toggle-rates').textContent = content.hidden ? 'Настроить цепочку' : 'Свернуть настройки';
    byId('toggle-rates').setAttribute('aria-expanded', String(!content.hidden));
});
byId('add-currency').addEventListener('click', () => {
    if (settings.names.length >= 10) return;
    settings.names.push('EUR');
    settings.rates.push('');
    byId('route-preset').value = 'custom';
    renderChain(); saveSettings();
});
byId('remove-currency').addEventListener('click', () => {
    if (settings.names.length <= 2) return;
    settings.names.pop(); settings.rates.pop();
    settings.atmCurrency = Math.min(settings.atmCurrency, settings.names.length - 1);
    settings.atmCardCurrency = Math.min(settings.atmCardCurrency, settings.names.length - 1);
    settings.pairs.pop(); byId('route-preset').value = 'custom';
    if (sourceIndex >= settings.names.length) { sourceIndex = 0; sourceValue = ''; }
    renderChain(); saveSettings();
});
byId('route-preset').addEventListener('change', () => {
    const route = byId('route-preset').value;
    if (route === 'custom') return;
    const usd = settings.names.findIndex(n => n.trim().toUpperCase() === 'USD');
    const isLocal = name => name && !['RUB', 'KGS', 'USD'].includes(name.trim().toUpperCase());
    const selectedCash = settings.names[settings.atmCurrency];
    const local = isLocal(selectedCash) ? selectedCash : isLocal(settings.names[usd + 1]) ? settings.names[usd + 1] : settings.names.find(isLocal) || 'RSD';
    settings.names = route === 'elqr' ? ['RUB', 'KGS', 'USD', local] : ['RUB', 'USD', local];
    settings.rates = settings.names.slice(1).map(() => '');
    settings.pairs = route === 'elqr' ? [{source:'multi'}, {source:'bakai'}, {source:'visa',fee:'1.5'}] : [{source:'unired'}, {source:'visa',fee:'1.5'}];
    settings.atmCurrency = settings.names.length - 1; settings.atmCardCurrency = settings.names.length - 2;
    sourceIndex = 0; sourceValue = ''; renderChain(); saveSettings();
});
byId('atm-enabled').checked = settings.atmEnabled;
byId('atm-percent').value = settings.atmPercent;
byId('atm-mode').value = settings.atmMode;
byId('atm-minimum').value = settings.atmMinimum;
byId('atm-amount').value = settings.atmAmount;
['atm-enabled', 'atm-currency', 'atm-card-currency', 'atm-percent', 'atm-minimum', 'atm-amount', 'atm-mode'].forEach(id => {
    byId(id).addEventListener(['atm-percent', 'atm-minimum', 'atm-amount'].includes(id) ? 'input' : 'change', () => {
        if (id === 'atm-mode') byId('atm-amount').value = '';
        settings.atmEnabled = byId('atm-enabled').checked;
        settings.atmCurrency = Number(byId('atm-currency').value);
        settings.atmCardCurrency = Number(byId('atm-card-currency').value);
        settings.atmMinimum = byId('atm-minimum').value;
        settings.atmAmount = byId('atm-amount').value;
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
    } finally { button.disabled = false;
        settings.names.forEach((name, i) => { const select = byId('name-' + i); const value = name.trim().toUpperCase(); select.replaceChildren(); [...currencyOptions(), ['__custom', 'Своя валюта…']].forEach(([code, text]) => { const option = document.createElement('option'); option.value = code; option.textContent = text; select.append(option); }); select.value = value; });
        recalculate(); }
}
byId('refresh-rates').addEventListener('click', refreshRates);
refreshRates();
setInterval(refreshRates, 5 * 60000);
