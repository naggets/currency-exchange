(function (root) {
    const sources = {
        manual: { name: 'Ручной ввод', url: null },
        bakai: { name: 'Бакай · безналичный', url: 'https://bakai.kg/ru/' },
        visa: { name: 'Visa · копия Kylc · USD → валюта', url: 'https://www.kylc.com/huilv/i-visa/usd/rsd.html' },
        unired: { name: 'Unired · Curso · RUB → USD', url: 'https://t.me/s/CursoUz' },
        multi: { name: 'МТС ELQR · Curso · RUB → KGS', url: 'https://t.me/s/CursoUz' }
    };
    function lookup(feed, source, from, to, now = Date.now()) {
        if (!feed || feed.schemaVersion !== 1 || !Array.isArray(feed.quotes)) return { error: 'Курсы ещё не загружены.' };
        const quote = feed.quotes.find(item => item.source === source && item.from === from && item.to === to);
        if (!quote) return { error: feed.providers?.[source]?.status === 'unavailable' ? feed.providers[source].message : 'В источнике нет курса для этой пары. Введите его вручную.' };
        const age = now - Date.parse(quote.fetchedAt);
        if (quote.available !== true || !Number.isFinite(quote.rate) || quote.rate <= 0 || !Number.isFinite(age) || age < -300000 || age > 6 * 3600000) {
            return { error: 'Свежий курс недоступен. Проверьте источник или введите курс вручную.' };
        }
        if (source === 'unired' || source === 'multi') {
            const sourceAge = now - Date.parse(quote.sourceUpdatedAt);
            if (!Number.isFinite(sourceAge) || sourceAge < -300000 || sourceAge > 36 * 3600000) return { error: 'Утренняя публикация устарела. Проверьте курс в приложении или задайте вручную.' };
        }
        if (source === 'visa' && quote.sourceDate) {
            const dateAge = now - Date.parse(quote.sourceDate);
            if (!Number.isFinite(dateAge) || dateAge < -86400000 || dateAge > 3 * 86400000) return { error: 'Дата курса Visa устарела. Проверьте оригинал или задайте курс вручную.' };
        }
        return { quote };
    }
    const api = { sources, lookup };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.RateSources = api;
})(typeof window !== 'undefined' ? window : globalThis);
