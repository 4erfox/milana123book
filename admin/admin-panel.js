/**
 * admin/admin-panel.js — Главный файл Админ Панели
 *
 * Подключение в HTML (перед </body>):
 *   <script type="module" src="/admin/admin-panel.js"></script>
 *
 * Горячая клавиша: Ctrl+Shift+A
 */

import { onStatusChange, getStatus }    from './bridge.js';
import { mountToastContainer }           from './toast.js';
import { makeTokens, getT, setTheme, detectTheme, onThemeChange } from './theme.js';
import { renderPagesPanel }              from './panels/PagesPanel.js';
import { renderContactsPanel }           from './panels/ContactsPanel.js';
import { renderAssetsPanel }             from './panels/AssetsPanel.js';
import { renderSitePanel }               from './panels/SitePanel.js';

// ─── Инициализация темы ────────────────────────────────────────────────────────

setTheme(detectTheme());

// Следим за сменой темы на сайте
const observer = new MutationObserver(() => {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  setTheme(isDark);
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ─── Состояние панели ──────────────────────────────────────────────────────────

let panelOpen = false;
let activeTab  = 'pages';
let panelEl    = null;
let triggerEl  = null;

// Позиция и размер (drag & resize)
let panelRight = 16, panelTop = 40;
let panelW = 520, panelH = 600;

// ─── Иконки SVG ───────────────────────────────────────────────────────────────

const ICONS = {
  adminUser: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M22 11.5A2.5 2.5 0 0 1 19.5 14"/><path d="M22 8.5a2.5 2.5 0 0 0-5 0v3h5V8.5z"/></svg>`,
  pages:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  contacts:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  assets:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  site:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  close:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  wifi_off:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
  loader:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="adm-spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
  alert:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

const TABS = [
  { id: 'pages',    label: 'Страницы', icon: ICONS.pages    },
  { id: 'contacts', label: 'Контакты', icon: ICONS.contacts },
  { id: 'assets',   label: 'Ассеты',   icon: ICONS.assets   },
  { id: 'site',     label: 'Сайт',     icon: ICONS.site     },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('adm-styles')) return;
  const style = document.createElement('style');
  style.id = 'adm-styles';
  style.textContent = `
    @keyframes adm-spin { to { transform: rotate(360deg); } }
    @keyframes adm-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .adm-spin { animation: adm-spin 1s linear infinite; }
    .adm-pulse { animation: adm-pulse 1s ease-in-out infinite; }
    .adm-scroll::-webkit-scrollbar { width: 4px; height: 4px }
    .adm-scroll::-webkit-scrollbar-track { background: transparent }
    .adm-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 4px }
    #adm-panel * { box-sizing: border-box; }
    #adm-panel input, #adm-panel textarea, #adm-panel select { font-family: inherit; }
    #adm-panel a { color: inherit; }
  `;
  document.head.appendChild(style);
}

// ─── Триггер-кнопка ───────────────────────────────────────────────────────────

function createTrigger() {
  const t = getT();
  const btn = document.createElement('button');
  btn.id = 'adm-trigger';
  btn.title = 'Админ Панель (Ctrl+Shift+A)';
  Object.assign(btn.style, {
    position: 'fixed', left: '8px', bottom: '70px', zIndex: '99997',
    width: '44px', height: '44px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '2px',
    borderRadius: '10px', border: `1px solid ${t.border}`,
    background: t.surface, color: t.fgMuted,
    cursor: 'pointer', boxShadow: t.shadow,
    fontFamily: t.mono, transition: 'all 0.2s',
  });
  btn.innerHTML = `${ICONS.adminUser}<span style="font-size:7px;font-weight:700;letter-spacing:0.05em">ADMIN</span>`;
  btn.addEventListener('click', () => panelOpen ? closePanel() : openPanel());
  btn.addEventListener('mouseenter', () => { btn.style.background = t.surfaceHov; btn.style.color = t.fg; });
  btn.addEventListener('mouseleave', () => { btn.style.background = t.surface; btn.style.color = t.fgMuted; });

  onThemeChange(t => {
    btn.style.border = `1px solid ${t.border}`;
    btn.style.background = t.surface;
    btn.style.boxShadow = t.shadow;
  });

  document.body.appendChild(btn);
  return btn;
}

// ─── Создание панели ──────────────────────────────────────────────────────────

function createPanel() {
  const t = getT();
  const panel = document.createElement('div');
  panel.id = 'adm-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    right: panelRight + 'px', top: panelTop + 'px',
    width: panelW + 'px', height: panelH + 'px',
    zIndex: '99999',
    background: t.bg, border: `1px solid ${t.borderStrong}`,
    borderRadius: '12px', boxShadow: t.shadow,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden', fontFamily: t.mono,
  });

  panel.innerHTML = `
    <!-- Шапка -->
    <header id="adm-header" style="position:relative;display:flex;align-items:center;gap:10px;padding:10px 12px 9px;background:${t.surface};border-bottom:1px solid ${t.border};flex-shrink:0;user-select:none;cursor:move">

      <div style="position:relative;z-index:1;width:28px;height:28px;border-radius:7px;flex-shrink:0;background:${t.accentSoft};border:1px solid ${t.border};display:flex;align-items:center;justify-content:center">
        ${ICONS.adminUser}
      </div>

      <div style="position:relative;z-index:1;flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;font-weight:800;color:${t.fg};letter-spacing:0.06em">АДМИН ПАНЕЛЬ</span>
          <span style="font-size:8px;font-weight:700;color:${t.fgMuted};background:${t.accentSoft};border:1px solid ${t.border};border-radius:3px;padding:1px 5px;letter-spacing:0.1em">LOCAL</span>
        </div>
        <div id="adm-status-row" style="display:flex;align-items:center;gap:4px;margin-top:2px">
          <div id="adm-status-dot" style="width:5px;height:5px;border-radius:50%;background:${t.warning}"></div>
          <span id="adm-status-text" style="font-size:9px;color:${t.fgSub}">Подключение...</span>
        </div>
      </div>

      <button id="adm-close-btn" style="position:relative;z-index:1;width:26px;height:26px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer">
        ${ICONS.close}
      </button>
    </header>

    <!-- Табы -->
    <div id="adm-tabs" style="display:flex;background:${t.surface};border-bottom:1px solid ${t.border};flex-shrink:0;padding:0 4px">
    </div>

    <!-- Контент -->
    <div id="adm-content-wrap" style="flex:1;overflow:hidden;display:flex;flex-direction:column;position:relative">
      <!-- Оверлей при отключении -->
      <div id="adm-offline-overlay" style="display:none;position:absolute;inset:0;z-index:10;background:rgba(17,17,18,0.93);flex-direction:column;align-items:center;justify-content:center;gap:10px">
        <div id="adm-overlay-icon">${ICONS.loader}</div>
        <div id="adm-overlay-text" style="font-size:12px;color:${t.fgMuted}">Подключение...</div>
        <button id="adm-overlay-reload" style="display:none;padding:6px 14px;border-radius:7px;cursor:pointer;border:1px solid ${t.border};background:${t.surfaceHov};color:${t.fg};font-size:11px;font-family:${t.mono}">Обновить</button>
      </div>

      <!-- Панель контента -->
      <div id="adm-panel-content" style="flex:1;display:flex;flex-direction:column;overflow:hidden"></div>
    </div>

    <!-- Ресайз-хэндлы -->
    <button aria-label="resize-right"  id="adm-resize-r"  style="position:absolute;right:0;top:40px;bottom:8px;width:6px;cursor:col-resize;background:transparent;border:none;z-index:10;padding:0"></button>
    <button aria-label="resize-bottom" id="adm-resize-b"  style="position:absolute;bottom:0;left:8px;right:8px;height:6px;cursor:row-resize;background:transparent;border:none;z-index:10;padding:0"></button>
    <button aria-label="resize-corner" id="adm-resize-rb" style="position:absolute;bottom:0;right:0;width:14px;height:14px;cursor:nwse-resize;background:transparent;border:none;z-index:11;padding:0"></button>
  `;

  // Рендер табов
  renderTabs(panel);

  // Закрытие
  panel.querySelector('#adm-close-btn').addEventListener('click', closePanel);
  panel.querySelector('#adm-overlay-reload').addEventListener('click', () => location.reload());

  // Drag
  let dragging = false, resizing = null, startData = {};
  const header = panel.querySelector('#adm-header');

  header.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    startData = { mx: e.clientX, my: e.clientY, right: panelRight, top: panelTop };
    document.body.style.userSelect = 'none';
  });

  const onResizeStart = (dir) => (e) => {
    e.preventDefault(); e.stopPropagation();
    resizing = dir;
    startData = { mx: e.clientX, my: e.clientY, right: panelRight, top: panelTop, w: panelW, h: panelH };
    document.body.style.userSelect = 'none';
  };
  panel.querySelector('#adm-resize-r').addEventListener('mousedown', onResizeStart('r'));
  panel.querySelector('#adm-resize-b').addEventListener('mousedown', onResizeStart('b'));
  panel.querySelector('#adm-resize-rb').addEventListener('mousedown', onResizeStart('rb'));

  document.addEventListener('mousemove', e => {
    if (!dragging && !resizing) return;
    const dx = e.clientX - startData.mx, dy = e.clientY - startData.my;
    if (dragging) {
      panelRight = Math.max(0, Math.min(window.innerWidth - panelW, startData.right - dx));
      panelTop   = Math.max(0, Math.min(window.innerHeight - 60, startData.top + dy));
      panel.style.right = panelRight + 'px';
      panel.style.top   = panelTop   + 'px';
    } else if (resizing) {
      if (resizing === 'r' || resizing === 'rb') {
        panelW = Math.max(380, Math.min(window.innerWidth - 32, startData.w - dx));
        panel.style.width = panelW + 'px';
      }
      if (resizing === 'b' || resizing === 'rb') {
        panelH = Math.max(300, Math.min(window.innerHeight - 40, startData.h + dy));
        panel.style.height = panelH + 'px';
      }
    }
  });
  document.addEventListener('mouseup', () => {
    dragging = false; resizing = null;
    document.body.style.userSelect = '';
  });

  return panel;
}

// ─── Рендер табов ─────────────────────────────────────────────────────────────

function renderTabs(panel) {
  const t = getT();
  const tabsEl = panel.querySelector('#adm-tabs');
  tabsEl.innerHTML = TABS.map(tab => `
    <button class="adm-tab" data-tab="${tab.id}" style="
      display:flex;align-items:center;gap:5px;padding:9px 12px;border:none;
      border-bottom:2px solid ${tab.id === activeTab ? t.fg : 'transparent'};
      background:transparent;
      color:${tab.id === activeTab ? t.fg : t.fgMuted};
      font-size:11px;font-weight:${tab.id === activeTab ? 600 : 400};
      cursor:pointer;font-family:${t.mono};flex-shrink:0;outline:none;
    ">${tab.icon}${tab.label}</button>
  `).join('');

  tabsEl.querySelectorAll('.adm-tab').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      activeTab = btn.dataset.tab;
      renderTabs(panel);
      renderActivePanel();
    });
  });
}

// ─── Рендер контента ──────────────────────────────────────────────────────────

function renderActivePanel() {
  const content = panelEl?.querySelector('#adm-panel-content');
  if (!content) return;
  content.innerHTML = '';

  if (activeTab === 'pages')    renderPagesPanel(content);
  if (activeTab === 'contacts') renderContactsPanel(content);
  if (activeTab === 'assets')   renderAssetsPanel(content);
  if (activeTab === 'site')     renderSitePanel(content);
}

// ─── Обновление статуса ───────────────────────────────────────────────────────

function updateStatus(status) {
  if (!panelEl) return;
  const t = getT();
  const dot     = panelEl.querySelector('#adm-status-dot');
  const text    = panelEl.querySelector('#adm-status-text');
  const overlay = panelEl.querySelector('#adm-offline-overlay');
  const icon    = panelEl.querySelector('#adm-overlay-icon');
  const msg     = panelEl.querySelector('#adm-overlay-text');
  const reload  = panelEl.querySelector('#adm-overlay-reload');

  const colors = { connected: t.success, connecting: t.warning, disconnected: t.danger, error: t.danger };
  const labels = { connected: 'Подключено', connecting: 'Подключение...', disconnected: 'Отключено', error: 'Ошибка' };

  if (dot)  { dot.style.background = colors[status] || t.fgSub; dot.className = status === 'connecting' ? 'adm-pulse' : ''; }
  if (text) { text.textContent = labels[status] || status; text.style.color = status === 'connected' ? t.success : t.fgSub; }

  if (overlay) {
    const show = status !== 'connected';
    overlay.style.display = show ? 'flex' : 'none';
    if (show && icon) icon.innerHTML = status === 'connecting' ? ICONS.loader : ICONS.wifi_off;
    if (show && msg)  msg.textContent = status === 'connecting' ? 'Подключение к admin-server.js...' : 'Нет соединения. Запусти: node admin-server.js';
    if (reload) reload.style.display = status === 'connecting' ? 'none' : 'block';
  }

  // Иконка триггера
  if (triggerEl) {
    const hasIssue = status !== 'connected' && status !== 'connecting';
    triggerEl.innerHTML = hasIssue
      ? `<span style="color:${t.danger}">${ICONS.alert}</span><span style="font-size:7px;font-weight:700;letter-spacing:0.05em">ADMIN</span>`
      : `${ICONS.adminUser}<span style="font-size:7px;font-weight:700;letter-spacing:0.05em">ADMIN</span>`;
  }
}

// ─── Открытие / закрытие ──────────────────────────────────────────────────────

function openPanel() {
  panelW = Math.min(520, window.innerWidth - 32);
  panelH = Math.min(820, window.innerHeight - 56);
  panelRight = 16; panelTop = 40;

  if (!panelEl) {
    panelEl = createPanel();
    document.body.appendChild(panelEl);
    updateStatus(getStatus());
    renderActivePanel();
  } else {
    panelEl.style.display = 'flex';
  }
  Object.assign(panelEl.style, {
    right: panelRight + 'px', top: panelTop + 'px',
    width: panelW + 'px', height: panelH + 'px',
  });
  panelOpen = true;
}

function closePanel() {
  if (panelEl) panelEl.style.display = 'none';
  panelOpen = false;
}

// ─── Запуск ───────────────────────────────────────────────────────────────────

injectStyles();
mountToastContainer();
triggerEl = createTrigger();

// Подписка на статус WebSocket
onStatusChange(status => {
  updateStatus(status);
});

// Горячая клавиша Ctrl+Shift+A
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    panelOpen ? closePanel() : openPanel();
  }
  if (panelOpen && e.key === 'Escape') closePanel();
});

// Синхронизация темы
onThemeChange(() => {
  if (!panelEl) return;
  const t = getT();
  panelEl.style.background = t.bg;
  panelEl.style.border = `1px solid ${t.borderStrong}`;
  panelEl.style.boxShadow = t.shadow;
});
