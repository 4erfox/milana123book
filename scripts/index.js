// Инициализация темы
const APP_BASE = (() => {
    const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
    return baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
})();
function withBase(relativePath) {
    return `${APP_BASE}${String(relativePath).replace(/^\/+/, '')}`;
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
}
initTheme();

document.addEventListener('DOMContentLoaded', () => {

    // 1. ЭЛЕМЕНТЫ УПРАВЛЕНИЯ
    const sidebar        = document.querySelector('.sidebar');
    const overlay        = document.querySelector('.sidebar-overlay');
    const contentMenuBtn = document.querySelectorAll('.nav-btn')[0];
    const closeSidebarBtn= document.getElementById('close-sidebar');
    const contactsBtn    = document.getElementById('contacts-btn');
    const contactsMenu   = document.querySelector('.contacts-menu');
    const contactsCloseBtn = document.getElementById('contacts-close-btn');
    const searchInput    = document.getElementById('sidebar-search');

    function escapeHtml(str) {
        return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // 2. ЗАГРУЗКА КОНТАКТОВ — через API (сервер сохраняет туда же)
    async function loadContacts() {
        const container = document.querySelector('.contacts-content');
        if (!container) return;

        const fallback = `
            <div class="contact-item">
                <label class="contact-label">Сайт</label>
                <a href="https://etiquettebook.com" target="_blank" class="contact-value">etiquettebook.com</a>
            </div>
            <div class="contact-item">
                <label class="contact-label">Email</label>
                <a href="mailto:etiquettebook2026@gmail.com" class="contact-value">etiquettebook2026@gmail.com</a>
            </div>
        `;

        try {
            const res = await fetch(withBase('api/contacts'));
            if (!res.ok) throw new Error('api error');
            const data = await res.json();
            let contacts = [];
            try { contacts = JSON.parse(data.content || '[]'); } catch { contacts = []; }

            if (!contacts.length) { container.innerHTML = fallback; return; }

            container.innerHTML = contacts.map(c => `
                <div class="contact-item">
                    <label class="contact-label">${escapeHtml(c.title)}</label>
                    <a href="${escapeHtml(c.href)}" class="contact-value" ${c.external ? 'target="_blank"' : ''}>
                        ${escapeHtml(c.subtitle || c.href)}
                    </a>
                </div>
            `).join('');
        } catch {
            // Если API недоступен — читаем из статичного файла
            try {
                const res = await fetch(withBase('data/contacts.json') + '?t=' + Date.now());
                if (!res.ok) throw new Error('file error');
                const contacts = await res.json();
                if (!contacts.length) throw new Error('empty');
                container.innerHTML = contacts.map(c => `
                    <div class="contact-item">
                        <label class="contact-label">${escapeHtml(c.title)}</label>
                        <a href="${escapeHtml(c.href)}" class="contact-value" ${c.external ? 'target="_blank"' : ''}>
                            ${escapeHtml(c.subtitle || c.href)}
                        </a>
                    </div>
                `).join('');
            } catch {
                container.innerHTML = fallback;
            }
        }
    }

    // 3. ЗАГРУЗКА НАСТРОЕК САЙТА
    async function loadConfig() {
        try {
            const token = localStorage.getItem('adm_jwt');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(withBase('api/config'), { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const config = data.config || {};
            localStorage.setItem('siteConfig', JSON.stringify(config));
            applyConfig(config);
        } catch {
            const savedConfig = localStorage.getItem('siteConfig');
            if (savedConfig) {
                try { applyConfig(JSON.parse(savedConfig)); } catch {}
            }
        }
    }

    function applyConfig(config) {
        const mainTitle = document.querySelector('.hero h1');
        if (mainTitle && config.siteTitle) {
            mainTitle.textContent = config.siteTitle;
            document.title = config.siteTitle;
        }
        const subTitle = document.querySelector('.subtitle');
        if (subTitle && config.siteDescription) {
            subTitle.textContent = config.siteDescription;
        }
    }

    // 4. ЗАГРУЗКА МЕНЮ ИЗ nav.json
    async function loadNav() {
        try {
            const res = await fetch(withBase('data/nav.json') + '?t=' + Date.now());
            if (!res.ok) return;
            const nav = await res.json();
            const sidebarContent = document.querySelector('.sidebar-content');
            if (!sidebarContent) return;

            sidebarContent.innerHTML = nav.map(section => `
                <div class="menu-section" data-section="${section.id}">
                    <div class="menu-section-title">
                        <div class="menu-section-title-content">
                            <span class="menu-section-title-text">${section.title}</span>
                            <div class="menu-section-controls">
                                <span class="menu-section-counter">${section.pages.length}</span>
                                <div class="menu-section-arrow">
                                    <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="menu-items">
                        ${section.pages.map(p => {
                            const cleanHref = String(p.href || '').replace(/^\/+/, '');
                            return `<a href="${withBase(cleanHref)}" class="menu-item" style="text-decoration:none;color:inherit;display:block">${p.title}</a>`;
                        }).join('')}
                    </div>
                </div>
            `).join('');

            sidebarContent.querySelectorAll('.menu-section-title').forEach(title => {
                title.addEventListener('click', () => {
                    title.closest('.menu-section')?.classList.toggle('open');
                });
            });
        } catch (err) {
            console.log('nav.json не найден:', err);
        }
    }

    // ЗАПУСКАЕМ ЗАГРУЗКУ
    loadContacts();
    loadConfig();
    loadNav();

    // 5. ОТКРЫТИЕ / ЗАКРЫТИЕ МЕНЮ
    function openSidebar() {
        sidebar?.classList.add('open');
        overlay?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('open');
        contactsMenu?.classList.remove('open');
        document.body.style.overflow = '';
    }

    // 6. ОБРАБОТЧИКИ
    contentMenuBtn?.addEventListener('click', openSidebar);
    closeSidebarBtn?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);
    contactsBtn?.addEventListener('click', () => contactsMenu?.classList.add('open'));
    contactsCloseBtn?.addEventListener('click', () => contactsMenu?.classList.remove('open'));

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeSidebar();
    });

    // 7. ПОИСК В МЕНЮ
    searchInput?.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        document.querySelectorAll('.menu-item').forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(query) ? 'block' : 'none';
        });
        document.querySelectorAll('.menu-section').forEach(section => {
            const hasVisible = Array.from(section.querySelectorAll('.menu-item')).some(i => i.style.display === 'block');
            section.style.display = hasVisible ? 'block' : 'none';
            if (query && hasVisible) section.classList.add('open');
        });
    });

    // 8. АККОРДЕОН
    document.querySelectorAll('.menu-section-title').forEach(title => {
        title.addEventListener('click', () => title.closest('.menu-section')?.classList.toggle('open'));
    });

    // 9. ОТКРЫТИЕ РАЗДЕЛА ПО ХЭШУ (из хлебных крошек)
    window.addEventListener('load', () => {
        const hash = location.hash.slice(1);
        if (hash) {
            sidebar?.classList.add('open');
            overlay?.classList.add('open');
            const section = document.querySelector(`.menu-section[data-section="${hash}"]`);
            if (section) {
                section.classList.add('open');
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

});