/* Keep native selects as the data source; enhance their menus without changing calculator events. */
(function () {
    const menus = new Map();
    let active = null;
    function close() {
        if (!active) return;
        active.popup.hidden = true;
        active.button.setAttribute('aria-expanded', 'false');
        active = null;
    }
    function enhance(select) {
        const wrapper = document.createElement('div');
        wrapper.className = 'select-menu';
        select.before(wrapper);
        wrapper.append(select);
        select.classList.add('native-select');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'select-trigger rate-input';
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-expanded', 'false');
        const popup = document.createElement('div');
        popup.className = 'select-popup';
        popup.id = `${select.id}-menu`;
        popup.hidden = true;
        button.setAttribute('aria-controls', popup.id);
        const search = document.createElement('input');
        search.type = 'search'; search.className = 'select-search';
        search.placeholder = 'Найти валюту…'; search.setAttribute('aria-label', 'Поиск варианта');
        const list = document.createElement('div');
        list.className = 'select-options'; list.setAttribute('role', 'listbox');
        const empty = document.createElement('p');
        empty.className = 'select-empty'; empty.textContent = 'Ничего не найдено'; empty.hidden = true;
        popup.append(search, list, empty); wrapper.append(button, popup);
        const menu = { select, wrapper, button, popup, search, list, empty };
        menus.set(select, menu);
        function options() { return [...list.querySelectorAll('button:not(:disabled)')]; }
        function draw() {
            list.replaceChildren();
            const query = search.value.trim().toLocaleLowerCase('ru');
            for (const option of select.options) {
                if (option.hidden || !option.textContent.toLocaleLowerCase('ru').includes(query)) continue;
                const item = document.createElement('button');
                item.type = 'button'; item.className = 'select-option'; item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', String(option.selected));
                item.textContent = option.textContent; item.disabled = option.disabled;
                item.addEventListener('click', () => {
                    select.value = option.value;
                    close(); button.focus();
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    sync();
                });
                list.append(item);
            }
            empty.hidden = list.children.length > 0;
        }
        function open() {
            if (select.disabled) return;
            close(); active = menu; search.value = ''; search.hidden = select.options.length < 12;
            draw(); popup.hidden = false; button.setAttribute('aria-expanded', 'true');
            const rect = button.getBoundingClientRect();
            const width = Math.min(Math.max(rect.width, 280), innerWidth - 24);
            const below = innerHeight - rect.bottom - 12;
            const height = Math.min(340, Math.max(below, rect.top - 12));
            Object.assign(popup.style, { width: `${width}px`, maxHeight: `${height}px`, left: `${Math.max(12, Math.min(rect.left, innerWidth - width - 12))}px`, top: below >= Math.min(220, height) ? `${rect.bottom + 6}px` : `${Math.max(12, rect.top - height - 6)}px` });
            if (!search.hidden) search.focus();
            else (list.querySelector('[aria-selected="true"]') || options()[0])?.focus();
        }
        button.addEventListener('click', () => active === menu ? close() : open());
        button.addEventListener('keydown', event => {
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); open(); }
        });
        search.addEventListener('input', draw);
        popup.addEventListener('keydown', event => {
            const items = options(), index = items.indexOf(document.activeElement);
            if (event.key === 'Escape') { event.preventDefault(); close(); button.focus(); }
            else if (event.key === 'Tab') close();
            else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? Math.min(index + 1, items.length - 1) : Math.max(index - 1, 0);
                items[next]?.focus();
            } else if (event.key === 'Enter' && document.activeElement === search) {
                event.preventDefault(); items[0]?.click();
            } else if (search.hidden && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
                const match = items.find(item => item.textContent.toLowerCase().startsWith(event.key.toLowerCase()));
                match?.focus();
            }
        });
        select.addEventListener('focus', () => button.focus());
        for (const label of select.labels) label.addEventListener('click', event => { event.preventDefault(); button.focus(); });
    }
    function sync() {
        for (const [select, menu] of menus) {
            if (!select.isConnected) { if (active === menu) close(); menus.delete(select); continue; }
            menu.button.textContent = select.selectedOptions[0]?.textContent || 'Выберите…';
            menu.button.disabled = select.disabled;
            const label = [...select.labels].map(item => item.textContent).join(' ') || select.getAttribute('aria-label') || 'Вариант';
            menu.button.setAttribute('aria-label', `${label}: ${menu.button.textContent}`);
            menu.list.setAttribute('aria-label', label);
        }
        document.querySelectorAll('select:not(.native-select)').forEach(enhance);
        // Newly enhanced selects need their initial text, too.
        for (const [select, menu] of menus) {
            if (!menu.button.textContent) {
                menu.button.textContent = select.selectedOptions[0]?.textContent || 'Выберите…';
                menu.button.disabled = select.disabled;
                const label = [...select.labels].map(item => item.textContent).join(' ') || 'Вариант';
                menu.button.setAttribute('aria-label', `${label}: ${menu.button.textContent}`);
                menu.list.setAttribute('aria-label', label);
            }
        }
    }
    document.addEventListener('pointerdown', event => { if (active && !active.wrapper.contains(event.target)) close(); });
    document.addEventListener('toggle', () => { if (active && !active.select.getClientRects().length && !active.wrapper.getClientRects().length) close(); }, true);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', event => { if (active && !active.popup.contains(event.target)) close(); }, true);
    window.SelectMenus = { sync };
})();
