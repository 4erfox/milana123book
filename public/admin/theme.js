/**
 * admin/theme.js — цветовые токены
 */

export function makeTokens(isDark) {
  return isDark ? {
    bg:           '#111112',
    surface:      '#18181a',
    surfaceHov:   '#1f1f22',
    border:       'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(255,255,255,0.18)',
    fg:           '#e8e8e8',
    fgMuted:      'rgba(255,255,255,0.4)',
    fgSub:        'rgba(255,255,255,0.2)',
    accentSoft:   'rgba(255,255,255,0.06)',
    success:      '#22c55e',
    danger:       '#ef4444',
    warning:      '#f59e0b',
    mono:         'ui-monospace,"Cascadia Code","Fira Code",monospace',
    shadow:       '0 8px 40px rgba(0,0,0,0.7)',
    inpBg:        '#1e1e20',
    inpBorder:    'rgba(255,255,255,0.12)',
  } : {
    bg:           '#f0efeb',
    surface:      '#e5e4e0',
    surfaceHov:   '#dddcd8',
    border:       'rgba(0,0,0,0.1)',
    borderStrong: 'rgba(0,0,0,0.2)',
    fg:           '#111111',
    fgMuted:      'rgba(0,0,0,0.45)',
    fgSub:        'rgba(0,0,0,0.25)',
    accentSoft:   'rgba(0,0,0,0.06)',
    success:      '#16a34a',
    danger:       '#dc2626',
    warning:      '#d97706',
    mono:         'ui-monospace,"Cascadia Code","Fira Code",monospace',
    shadow:       '0 8px 32px rgba(0,0,0,0.18)',
    inpBg:        '#e8e7e3',
    inpBorder:    'rgba(0,0,0,0.12)',
  };
}

let _t = makeTokens(true);
const _cbs = new Set();

export function getT() { return _t; }

export function setTheme(isDark) {
  _t = makeTokens(isDark);
  _cbs.forEach(fn => fn(_t));
}

export function onThemeChange(fn) {
  _cbs.add(fn);
  return () => _cbs.delete(fn);
}

// Определяем тему из localStorage или атрибута data-theme
export function detectTheme() {
  const stored = localStorage.getItem('theme');
  if (stored) return stored !== 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr !== 'light';
  return true; // по умолчанию тёмная
}
