/**
 * admin/panels/SitePanel.js — SEO и настройки сайта
 * Читает/пишет admin-config.json в корне проекта
 */

import { bridge } from '../bridge.js';
import { toast } from '../toast.js';
import { getT } from '../theme.js';

const DEFAULTS = {
  siteTitle:       'Деловой этикет в Казахстане',
  siteDescription: 'Введение в профессиональную культуру и деловые отношения.',
  siteUrl:         '',
  siteAuthor:      '',
  keywords:        '',
  metaRobots:      'index, follow',
  ogImage:         '',
  twitterSite:     '',
  contactEmail:    '',
};

export function renderSitePanel(container) {
  const t = getT();
  let cfg = { ...DEFAULTS };
  let dirty = false;
  let saved = false;

  async function load() {
    try {
      const res = await bridge.readSiteConfig();
      cfg = { ...DEFAULTS, ...res.config };
      dirty = false;
      render();
    } catch(e) {
      cfg = { ...DEFAULTS };
      render();
    }
  }

  async function save() {
    try {
      await bridge.writeSiteConfig(cfg);
      dirty = false;
      saved = true;
      toast.success('Настройки сохранены в admin-config.json');
      renderSaveBtn();
      setTimeout(() => { saved = false; renderSaveBtn(); }, 2500);
    } catch(e) { toast.error(e.message); }
  }

  function renderSaveBtn() {
    const btn = container.querySelector('#adm-site-save');
    if (!btn) return;
    btn.textContent = saved ? '✓ Сохранено' : 'Сохранить';
    btn.style.borderColor  = saved ? t.success + '66' : dirty ? t.borderStrong : t.border;
    btn.style.background   = saved ? 'rgba(34,197,94,0.1)' : dirty ? t.surfaceHov : 'transparent';
    btn.style.color        = saved ? t.success : dirty ? t.fg : t.fgMuted;
  }

  function field(id, label, placeholder, wide = false, type = 'text') {
    return `
      <div style="grid-column:${wide ? '1 / -1' : 'auto'}">
        <label for="${id}" style="display:block;font-size:9px;color:${t.fgSub};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;font-family:${t.mono}">${label}</label>
        ${type === 'textarea'
          ? `<textarea id="${id}" placeholder="${placeholder}" rows="3"
               style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid ${t.border};background:${t.inpBg};color:${t.fg};font-size:11px;outline:none;font-family:${t.mono};box-sizing:border-box;resize:vertical"
             >${escHtml(cfg[id.replace('adm-site-', '').replace(/-/g, '')] ?? '')}</textarea>`
          : `<input id="${id}" type="${type}" placeholder="${placeholder}" value="${escHtml(cfg[id.replace('adm-site-', '').replace(/-/g, '')] ?? '')}"
               style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid ${t.border};background:${t.inpBg};color:${t.fg};font-size:11px;outline:none;font-family:${t.mono};box-sizing:border-box">`
        }
      </div>
    `;
  }

  function escHtml(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  }

  function render() {
    const t = getT();
    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid ${t.border};background:${t.surface};flex-shrink:0">
        <span style="flex:1;font-size:10px;color:${t.fgSub};font-family:${t.mono}">
          ${dirty ? `<span style="color:${t.warning}">● </span>` : ''}admin-config.json
        </span>
        <button id="adm-site-reload" style="display:flex;align-items:center;gap:4px;padding:5px 9px;border-radius:6px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Обновить
        </button>
        <button id="adm-site-save" style="display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">
          Сохранить
          <span style="font-size:9px;color:${t.fgSub};background:${t.inpBg};border:1px solid ${t.border};border-radius:3px;padding:1px 4px">Ctrl+S</span>
        </button>
      </div>

      <div style="flex:1;overflow-y:auto" class="adm-scroll">

        <!-- Основное -->
        <div style="border-bottom:1px solid ${t.border}">
          <div style="display:flex;align-items:center;gap:7px;padding:9px 12px;background:${t.surface};font-size:10px;font-weight:700;color:${t.fgMuted};font-family:${t.mono};text-transform:uppercase;letter-spacing:0.08em">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Основное
          </div>
          <div style="padding:8px 12px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${field('adm-site-siteUrl', 'URL сайта', 'https://example.com', true)}
            ${field('adm-site-siteTitle', 'Название сайта', 'Мой сайт', true)}
            ${field('adm-site-siteDescription', 'Описание', 'Краткое описание...', true, 'textarea')}
            ${field('adm-site-keywords', 'Ключевые слова', 'слово1, слово2', true)}
            ${field('adm-site-siteAuthor', 'Автор', 'Имя Фамилия')}
            ${field('adm-site-contactEmail', 'Email для контактов', 'email@example.com')}
          </div>
        </div>

        <!-- SEO -->
        <div style="border-bottom:1px solid ${t.border}">
          <div style="display:flex;align-items:center;gap:7px;padding:9px 12px;background:${t.surface};font-size:10px;font-weight:700;color:${t.fgMuted};font-family:${t.mono};text-transform:uppercase;letter-spacing:0.08em">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            SEO
          </div>
          <div style="padding:8px 12px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <label style="display:block;font-size:9px;color:${t.fgSub};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;font-family:${t.mono}">Meta Robots</label>
              <select id="adm-site-metaRobots" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid ${t.border};background:${t.inpBg};color:${t.fg};font-size:11px;outline:none;font-family:${t.mono};cursor:pointer">
                <option value="index, follow" ${cfg.metaRobots === 'index, follow' ? 'selected' : ''}>✅ index, follow</option>
                <option value="noindex, follow" ${cfg.metaRobots === 'noindex, follow' ? 'selected' : ''}>🚫 noindex, follow</option>
                <option value="noindex, nofollow" ${cfg.metaRobots === 'noindex, nofollow' ? 'selected' : ''}>🚫 noindex, nofollow</option>
              </select>
            </div>
            ${field('adm-site-ogImage', 'OG Image', '/assets/og.png')}
            ${field('adm-site-twitterSite', 'Twitter @site', '@mysite')}
          </div>
        </div>

        <div style="height:24px"></div>
      </div>
    `;

    // Привязка событий
    container.querySelector('#adm-site-reload').addEventListener('click', load);
    container.querySelector('#adm-site-save').addEventListener('click', save);

    // Input listeners — обновляем cfg при вводе
    const fieldMap = {
      'adm-site-siteUrl': 'siteUrl', 'adm-site-siteTitle': 'siteTitle',
      'adm-site-siteDescription': 'siteDescription', 'adm-site-keywords': 'keywords',
      'adm-site-siteAuthor': 'siteAuthor', 'adm-site-contactEmail': 'contactEmail',
      'adm-site-ogImage': 'ogImage', 'adm-site-twitterSite': 'twitterSite',
      'adm-site-metaRobots': 'metaRobots',
    };
    Object.entries(fieldMap).forEach(([id, key]) => {
      const el = container.querySelector('#' + id);
      if (!el) return;
      el.addEventListener('input', () => { cfg[key] = el.value; dirty = true; renderSaveBtn(); });
      el.addEventListener('change', () => { cfg[key] = el.value; dirty = true; renderSaveBtn(); });
    });

    // Ctrl+S
    container.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
    });
  }

  load();
}
