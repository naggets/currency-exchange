function extractObject(text, start) {
    let depth = 0, quoted = false, escaped = false;
    for (let i = start; i < text.length; i++) {
        const char = text[i];
        if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; continue; }
        if (char === '"') quoted = true;
        else if (char === '{') depth++;
        else if (char === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
    throw new Error('Incomplete currency data');
}
function parseBakai(html, fetchedAt) {
    for (const match of html.matchAll(/self\.__next_f\.push\((\[[^<]*?)\)<\/script>/g)) {
        let chunk;
        try { chunk = JSON.parse(match[1])[1]; } catch { continue; }
        if (typeof chunk !== 'string') continue;
        const marker = '"data":{"latest_update_time"';
        const index = chunk.indexOf(marker);
        if (index < 0) continue;
        const data = extractObject(chunk, index + '"data":'.length);
        const usd = data.result?.map(row => row.USD).find(Boolean);
        const buy = usd?.non_cash?.buy, sell = usd?.non_cash?.sell;
        if (!Number.isFinite(buy) || buy <= 0 || !Number.isFinite(sell) || sell <= 0) throw new Error('No valid non-cash USD buy/sell rates');
        const sourceUpdatedAtLocal = data.latest_update_time?.last_execution;
        if (typeof sourceUpdatedAtLocal !== 'string') throw new Error('No bank update timestamp');
        return [
            { from: 'KGS', to: 'USD', rate: 1 / sell, note: `Безналичная продажа USD банком: 1 USD = ${sell} KGS.` },
            { from: 'USD', to: 'KGS', rate: buy, note: `Безналичная покупка USD банком: 1 USD = ${buy} KGS.` }
        ].map(quote => ({...quote, source:'bakai', available:true, fetchedAt, sourceUpdatedAtLocal,
            sourceUrl:'https://bakai.kg/ru/', note: quote.note + ' Курс главного отделения; индивидуальные курсы и условия приложения могут отличаться.'}));
    }
    throw new Error('Bank currency widget not found');
}
module.exports={parseBakai};
