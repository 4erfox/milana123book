/**
 * admin/toast.js — Toast-уведомления
 */

let _toasts = [];
const _listeners = new Set();

function notify() { _listeners.forEach(fn => fn([..._toasts])); }

function addToast(type, message) {
  const id = crypto.randomUUID();
  _toasts = [..._toasts, { id, type, message }];
  notify();
  setTimeout(() => removeToast(id), 3500);
}

function removeToast(id) {
  _toasts = _toasts.filter(t => t.id !== id);
  notify();
}

export const toast = {
  success: msg => addToast('success', msg),
  error:   msg => addToast('error',   msg),
  info:    msg => addToast('info',     msg),
  warning: msg => addToast('warning',  msg),
};

const ICONS = {
  success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  info:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};
const COLORS = {
  success: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)'  },
  error:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'  },
  info:    { color: '#7c5cfc', bg: 'rgba(124,92,252,0.08)',  border: 'rgba(124,92,252,0.25)' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
};

export function mountToastContainer() {
  let container = document.getElementById('adm-toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'adm-toasts';
    Object.assign(container.style, {
      position: 'fixed', bottom: '24px', right: '24px',
      zIndex: '100010', display: 'flex', flexDirection: 'column',
      gap: '8px', alignItems: 'flex-end', pointerEvents: 'none',
    });
    document.body.appendChild(container);
  }

  _listeners.add(items => {
    container.innerHTML = '';
    items.forEach(item => {
      const cfg = COLORS[item.type];
      const el = document.createElement('div');
      el.style.cssText = `
        display:flex; align-items:flex-start; gap:9px; padding:9px 12px;
        background:${cfg.bg}; border:1px solid ${cfg.border}; border-radius:8px;
        box-shadow:0 4px 20px rgba(0,0,0,0.5);
        font-family:ui-monospace,"Cascadia Code","Fira Code",monospace;
        min-width:220px; max-width:320px; pointer-events:auto;
        transform:translateX(0); opacity:1;
        transition:transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease;
      `;
      el.innerHTML = `
        <span style="color:${cfg.color};flex-shrink:0;margin-top:1px">${ICONS[item.type]}</span>
        <span style="flex:1;font-size:12px;color:rgba(255,255,255,0.9);line-height:1.4">${item.message}</span>
        <button data-id="${item.id}" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.22);padding:0;display:flex;flex-shrink:0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      el.querySelector('button').addEventListener('click', () => removeToast(item.id));
      container.appendChild(el);
    });
  });
}
