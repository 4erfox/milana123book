// public/scripts/index.js

// ─── Функция для правильных путей на GitHub Pages ────────────────────────────
function resolvePath(relativePath) {
    if (relativePath.startsWith('http')) return relativePath;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return relativePath;
    }
    const path = window.location.pathname;
    const match = path.match(/^\/([^/]+)\//);
    if (match && match[1] !== '') {
        return '/' + match[1] + '/' + relativePath.replace(/^\//, '');
    }
    return relativePath;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. ЭЛЕМЕНТЫ УПРАВЛЕНИЯ
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const contentMenuBtn = document.querySelectorAll('.nav-btn')[0];
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const contactsBtn = document.getElementById('contacts-btn');
    const contactsMenu = document.querySelector('.contacts-menu');
    const contactsCloseBtn = document.getElementById('contacts-close-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const searchInput = document.getElementById('sidebar-search');

    // 2. ЗАГРУЗКА КОНТАКТОВ
    async function loadContacts() {
        try {
            const res = await fetch(resolvePath('/data/contacts.json'));
            const contacts = await res.json();
            const container = document.querySelector('.contacts-content');
            if (!container) return;
            container.innerHTML = contacts.map(c => `
                <div class="contact-item">
                    <label class="contact-label">${c.title}</label>
                    <a href="${c.href}" class="contact-value" ${c.external ? 'target="_blank"' : ''}>
                        ${c.subtitle || c.href}
                    </a>
                </div>
            `).join('');
        } catch (err) {
            console.log('Ошибка загрузки контактов:', err);
        }
    }

    // 3. ЗАГРУЗКА НАСТРОЕК САЙТА
    async function loadConfig() {
        try {
            // Пробуем через API (если сервер запущен)
            const res = await fetch(resolvePath('/api/config')).catch(() => null);
            if (res && res.ok) {
                const data = await res.json();
                const config = data.config;
                const mainTitle = document.querySelector('.hero h1');
                if (mainTitle && config.siteTitle) {
                    mainTitle.innerText = config.siteTitle;
                    document.title = config.siteTitle;
                }
                const subTitle = document.querySelector('.subtitle');
                if (subTitle && config.siteDescription) {
                    subTitle.innerText = config.siteDescription;
                }
            } else {
                // Фолбэк: читаем из admin-config.json
                const fallbackRes = await fetch(resolvePath('/admin/admin-config.json'));
                if (fallbackRes.ok) {
                    const config = await fallbackRes.json();
                    const mainTitle = document.querySelector('.hero h1');
                    if (mainTitle && config.siteTitle) mainTitle.innerText = config.siteTitle;
                    const subTitle = document.querySelector('.subtitle');
                    if (subTitle && config.siteDescription) subTitle.innerText = config.siteDescription;
                }
            }
        } catch (err) {
            console.log('Ошибка загрузки настроек:', err);
        }
    }

    // 4. ЗАГРУЗКА МЕНЮ ИЗ nav.json
    async function loadNav() {
        try {
            const res = await fetch(resolvePath('/data/nav.json?t=' + Date.now()));
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
                        ${section.pages.map(p => `
                            <a href="${resolvePath(p.href)}" class="menu-item" style="text-decoration:none;color:inherit;display:block">${p.title}</a>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            // Переподключаем аккордеон
            sidebarContent.querySelectorAll('.menu-section-title').forEach(title => {
                title.addEventListener('click', () => {
                    title.closest('.menu-section')?.classList.toggle('open');
                });
            });
        } catch (err) {
            console.log('Ошибка загрузки навигации:', err);
        }
    }

    // ЗАПУСКАЕМ ЗАГРУЗКУ ДАННЫХ
    loadContacts();
    loadConfig();
    loadNav();

    // 5. ФУНКЦИИ ОТКРЫТИЯ/ЗАКРЫТИЯ МЕНЮ
    function openSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.add('open');
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            if (contactsMenu) contactsMenu.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    // 6. ОБРАБОТЧИКИ КЛИКОВ
    if (contentMenuBtn) contentMenuBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    if (contactsBtn) contactsBtn.addEventListener('click', () => contactsMenu?.classList.add('open'));
    if (contactsCloseBtn) contactsCloseBtn.addEventListener('click', () => contactsMenu?.classList.remove('open'));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSidebar();
    });

    // 7. ЛОГИКА ПОИСКА В МЕНЮ
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.trim().toLowerCase();
            const menuItems = document.querySelectorAll('.menu-item');
            const menuSections = document.querySelectorAll('.menu-section');

            menuItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? 'block' : 'none';
            });

            menuSections.forEach(section => {
                const hasVisible = Array.from(section.querySelectorAll('.menu-item')).some(i => i.style.display === 'block');
                section.style.display = hasVisible ? 'block' : 'none';
                if (query && hasVisible) section.classList.add('open');
            });
        });
    }

    // 8. ПЕРЕКЛЮЧЕНИЕ ТЕМЫ
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // 9. АККОРДЕОН
    document.querySelectorAll('.menu-section-title').forEach(title => {
        title.addEventListener('click', () => {
            title.closest('.menu-section')?.classList.toggle('open');
        });
    });
});