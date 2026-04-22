/**
 * public/scripts/theme.js
 * Переключение светлой / тёмной темы
 * Подключить в page.html перед </body>
 */

(function () {
  const STORAGE_KEY = 'site_theme';
  const root = document.documentElement;

  // ── Применяем тему ──────────────────────────────────────────────────────────
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    const icon = btn.querySelector('.theme-icon');
    if (theme === 'dark') {
      icon.innerHTML = SUN_ICON;
      btn.setAttribute('title', 'Светлая тема');
    } else {
      icon.innerHTML = MOON_ICON;
      btn.setAttribute('title', 'Тёмная тема');
    }
  }

  // ── Иконки ──────────────────────────────────────────────────────────────────
  const MOON_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`;

  const SUN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`;

  // ── Создаём кнопку и вставляем в шапку ──────────────────────────────────────
  function injectButton() {
    const container = document.querySelector('.header-container');
    if (!container || document.getElementById('theme-toggle')) return;

    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle-btn';
    btn.innerHTML = `<span class="theme-icon"></span>`;

    btn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    // Вставляем между логотипом и кнопкой «Назад»
    const backBtn = container.querySelector('.back-btn');
    if (backBtn) {
      container.insertBefore(btn, backBtn);
    } else {
      container.appendChild(btn);
    }
  }

  // ── CSS переменные для тёмной темы ──────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('theme-styles')) return;
    const style = document.createElement('style');
    style.id = 'theme-styles';
    style.textContent = `
      /* ── Переход между темами ── */
      *, *::before, *::after {
        transition:
          background-color 0.3s ease,
          color 0.3s ease,
          border-color 0.3s ease;
      }

      /* ── Тёмная тема ── */
      [data-theme="dark"] {
        --bg-primary:    #0F0F0F;
        --bg-secondary:  #1A1A1A;
        --text-primary:  #F0EDE8;
        --text-secondary:#B8B4AE;
        --text-tertiary: #7A7672;
        --accent-color:  #E06040;
        --accent-hover:  #C84E2E;
        --border-color:  #2A2A2A;
        --sidebar-bg:    #161616;
      }

      [data-theme="dark"] body {
        background-color: var(--bg-primary);
        color: var(--text-primary);
      }

      [data-theme="dark"] .header {
        background: rgba(15, 15, 15, 0.98);
        border-bottom-color: var(--border-color);
      }

      [data-theme="dark"] .toc-sidebar {
        background: var(--sidebar-bg);
        border-color: var(--border-color);
      }

      [data-theme="dark"] .info-box {
        background: var(--sidebar-bg);
        border-color: var(--border-color);
      }

      [data-theme="dark"] .quote-block {
        border-left-color: var(--accent-color);
      }

      [data-theme="dark"] .content-figure {
        background: var(--bg-secondary);
        border-color: var(--border-color);
      }

      [data-theme="dark"] .back-btn {
        border-color: var(--border-color);
        color: var(--text-secondary);
      }

      [data-theme="dark"] .back-btn:hover {
        border-color: var(--accent-color);
        color: var(--accent-color);
        background: rgba(224, 96, 64, 0.08);
      }

      [data-theme="dark"] .page-nav-card {
        background: var(--bg-secondary);
        border-color: var(--border-color);
      }

      [data-theme="dark"] .page-nav-card:hover {
        border-color: var(--accent-color);
      }

      [data-theme="dark"] .section-text.dropcap::first-letter {
        color: var(--accent-color);
      }

      [data-theme="dark"] mark {
        background: rgba(224, 96, 64, 0.2);
        color: var(--accent-color);
      }

      /* ── Кнопка переключения темы ── */
      .theme-toggle-btn {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 1px solid var(--border-color, #E5E5E5);
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary, #4A4A4A);
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .theme-toggle-btn:hover {
        border-color: var(--accent-color, #C1502E);
        color: var(--accent-color, #C1502E);
        background: rgba(193, 80, 46, 0.06);
      }

      .theme-icon svg {
        width: 16px;
        height: 16px;
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Инициализация ────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    injectButton();

    // Восстанавливаем сохранённую тему
    const saved = localStorage.getItem(STORAGE_KEY);
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(saved || preferred);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Слушаем системные изменения темы
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
})();