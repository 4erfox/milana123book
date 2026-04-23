/**
 * admin/panels/PagesPanel.js
 * Управление страницами через .md файлы + Markdown редактор
 */

import { bridge } from '../bridge.js';
import { toast }  from '../toast.js';
import { getT }   from '../theme.js';

const IC = {
  file:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  folder: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  edit:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  link:   `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  reload: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  chevD:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
  back:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  save:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  bold:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>`,
  italic: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  grip:   `<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="3" cy="3" r="1.2"/><circle cx="7" cy="3" r="1.2"/><circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="3" cy="11" r="1.2"/><circle cx="7" cy="11" r="1.2"/></svg>`,
};

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

let dragState = null;

// ══════════════════════════════════════════════════════
// MARKDOWN РЕДАКТОР
// ══════════════════════════════════════════════════════

function openMdEditor(container, slug, title, onClose) {
  const t = getT();

  const overlay = document.createElement('div');
  overlay.style.cssText = `position:absolute;inset:0;z-index:30;background:${t.bg};display:flex;flex-direction:column;overflow:hidden`;

  overlay.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid ${t.border};background:${t.surface};flex-shrink:0">
      <button id="me-back" style="display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:6px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">${IC.back} Назад</button>
      <span style="flex:1;font-size:11px;font-weight:600;color:${t.fg};font-family:${t.mono};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(title)}</span>
      <span id="me-dirty" style="display:none;font-size:10px;color:${t.warning};font-family:${t.mono}">● не сохранено</span>
      <button id="me-save" style="display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;border:1px solid ${t.borderStrong};background:${t.surfaceHov};color:${t.fg};cursor:pointer;font-size:11px;font-family:${t.mono};font-weight:600">${IC.save} Сохранить <span style="font-size:9px;color:${t.fgSub};background:${t.inpBg};border:1px solid ${t.border};border-radius:3px;padding:1px 4px">Ctrl+S</span></button>
    </div>
    <div style="display:flex;align-items:center;gap:3px;padding:4px 10px;border-bottom:1px solid ${t.border};background:${t.surface};flex-shrink:0;flex-wrap:wrap">
      <button class="me-tool" data-wrap="**" data-wrap2="**" title="Жирный" style="padding:3px 7px;border-radius:4px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">${IC.bold}</button>
      <button class="me-tool" data-wrap="*" data-wrap2="*" title="Курсив" style="padding:3px 7px;border-radius:4px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">${IC.italic}</button>
      <button class="me-tool" data-insert="\`\`" title="Код" style="padding:3px 7px;border-radius:4px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">` + '`code`' + `</button>
      <div style="width:1px;height:14px;background:${t.border};margin:0 2px"></div>
      <button class="me-tool" data-line="## " title="Заголовок H2" style="padding:3px 7px;border-radius:4px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">H2</button>
      <button class="me-tool" data-line="### " title="Заголовок H3" style="padding:3px 7px;border-radius:4px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">H3</button>
      <button class="me-tool" data-line="- " title="Список" style="padding:3px 7px;border-radius:4px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">— список</button>
      <div style="width:1px;height:14px;background:${t.border};margin:0 2px"></div>
      <button class="me-tool" data-snippet="> **Заголовок блока**\n> Текст подсказки." title="Info-блок" style="padding:3px 7px;border-radius:4px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">💡 блок</button>
      <button class="me-tool" data-snippet="> *Текст цитаты.*" title="Цитата" style="padding:3px 7px;border-radius:4px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">" цитата</button>
    </div>
    <div style="flex:1;display:flex;overflow:hidden">
      <textarea id="me-editor"
        spellcheck="false"
        placeholder="Загрузка..."
        style="flex:1;padding:14px 16px;border:none;background:${t.bg};color:${t.fg};font-size:13px;font-family:ui-monospace,'Cascadia Code','Fira Code',monospace;line-height:1.75;resize:none;outline:none;tab-size:2"
      ></textarea>
    </div>
    <div style="padding:3px 12px;border-top:1px solid ${t.border};background:${t.surface};font-size:9px;color:${t.fgSub};font-family:${t.mono};flex-shrink:0;display:flex;gap:12px">
      <span id="me-words">0 слов</span>
      <span>Markdown · ## H2 · ### H3 · **жирный** · *курсив* · - список · > блок</span>
    </div>
  `;

  container.style.position = 'relative';
  container.appendChild(overlay);

  const ta      = overlay.querySelector('#me-editor');
  const dirtyEl = overlay.querySelector('#me-dirty');
  const saveBtn = overlay.querySelector('#me-save');
  const wordsEl = overlay.querySelector('#me-words');
  let dirty = false;

  function markDirty() {
    dirty = true;
    dirtyEl.style.display = 'inline';
  }

  function updateWords() {
    const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
    wordsEl.textContent = `${words} слов`;
  }

  // ── Загрузка MD ─────────────────────────────────────────────────────────────
  bridge.readDoc(slug).then(({ content }) => {
    ta.value = content;
    ta.placeholder = 'Введите Markdown...';
    updateWords();
  }).catch(e => {
    toast.error('Ошибка загрузки: ' + e.message);
    overlay.remove();
  });

  // ── Сохранение ──────────────────────────────────────────────────────────────
  async function save() {
    try {
      await bridge.writeDoc(slug, ta.value);
      dirty = false;
      dirtyEl.style.display = 'none';
      saveBtn.innerHTML = '✓ Сохранено';
      saveBtn.style.color = t.success;
      setTimeout(() => { saveBtn.innerHTML = IC.save + ' Сохранить'; saveBtn.style.color = t.fg; }, 2000);
      toast.success('Сохранено: docs/' + slug + '.md');
    } catch(e) { toast.error('Ошибка: ' + e.message); }
  }

  // ── Инструменты форматирования ──────────────────────────────────────────────
  overlay.querySelectorAll('.me-tool').forEach(btn => {
    btn.addEventListener('click', () => {
      ta.focus();
      const s = ta.selectionStart, e2 = ta.selectionEnd;
      const sel = ta.value.slice(s, e2);
      const scroll = ta.scrollTop;
      let newVal, newS, newE;

      if (btn.dataset.wrap) {
        const w1 = btn.dataset.wrap, w2 = btn.dataset.wrap2 || w1;
        newVal = ta.value.slice(0, s) + w1 + sel + w2 + ta.value.slice(e2);
        newS = s + w1.length; newE = newS + sel.length;
      } else if (btn.dataset.line) {
        const prefix = btn.dataset.line;
        const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
        newVal = ta.value.slice(0, lineStart) + prefix + ta.value.slice(lineStart);
        newS = newE = s + prefix.length;
      } else if (btn.dataset.snippet) {
        const snippet = '\n' + btn.dataset.snippet + '\n';
        newVal = ta.value.slice(0, s) + snippet + ta.value.slice(e2);
        newS = newE = s + snippet.length;
      }

      if (newVal !== undefined) {
        ta.value = newVal;
        requestAnimationFrame(() => {
          ta.scrollTop = scroll;
          ta.selectionStart = newS; ta.selectionEnd = newE;
        });
        markDirty(); updateWords();
      }
    });
  });

  // ── Tab ─────────────────────────────────────────────────────────────────────
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = s + 2;
    }
  });

  ta.addEventListener('input', () => { markDirty(); updateWords(); });

  // ── Ctrl+S ──────────────────────────────────────────────────────────────────
  overlay.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
  });

  overlay.querySelector('#me-back').addEventListener('click', () => {
    if (dirty && !confirm('Есть несохранённые изменения. Выйти?')) return;
    overlay.remove(); onClose?.();
  });
  saveBtn.addEventListener('click', save);
}

// ══════════════════════════════════════════════════════
// ГЛАВНАЯ ПАНЕЛЬ
// ══════════════════════════════════════════════════════

export function renderPagesPanel(container) {
  let nav = [], expanded = {};

  async function load() {
    renderLoading();
    try {
      const res = await bridge.listNav();
      nav = res.nav;
      nav.forEach(s => { if (expanded[s.id] === undefined) expanded[s.id] = true; });
      render();
    } catch(e) { renderError(e.message); }
  }

  async function saveNav() {
    try { await bridge.saveNav(nav); toast.success('Порядок сохранён'); }
    catch(e) { toast.error(e.message); }
  }

  function movePage(href, fromId, toId, beforeHref = null) {
    const from = nav.find(s => s.id === fromId), to = nav.find(s => s.id === toId);
    if (!from || !to) return;
    const page = from.pages.find(p => p.href === href);
    if (!page) return;
    from.pages = from.pages.filter(p => p.href !== href);
    if (beforeHref) {
      const idx = to.pages.findIndex(p => p.href === beforeHref);
      idx !== -1 ? to.pages.splice(idx, 0, page) : to.pages.push(page);
    } else { to.pages.push(page); }
    render(); saveNav();
  }

  function renderLoading() {
    const t = getT();
    container.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;color:${t.fgMuted}"><svg class="adm-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg><span style="font-size:12px;font-family:${t.mono}">Загрузка...</span></div>`;
  }

  function renderError(msg) {
    const t = getT();
    container.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;color:${t.danger};text-align:center"><div style="font-size:11px;font-family:${t.mono}">${esc(msg)}</div><button id="adm-err-reload" style="padding:6px 14px;border-radius:6px;border:1px solid ${t.border};background:${t.surfaceHov};color:${t.fg};cursor:pointer;font-size:11px;font-family:${t.mono}">Попробовать снова</button></div>`;
    container.querySelector('#adm-err-reload')?.addEventListener('click', load);
  }

  function render() {
    const t = getT();
    const total = nav.reduce((a, s) => a + (s.pages?.length ?? 0), 0);
    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid ${t.border};background:${t.surface};flex-shrink:0">
        <span style="font-size:10px;color:${t.fgSub};font-family:${t.mono}">${total} страниц · MD формат</span>
        <div style="flex:1"></div>
        <button id="adm-reload" style="display:flex;align-items:center;gap:4px;padding:6px 10px;border-radius:6px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">${IC.reload} Обновить</button>
      </div>
      <div style="padding:3px 10px;font-size:9px;color:${t.fgSub};background:${t.surface};border-bottom:1px solid ${t.border};font-family:${t.mono}">
        Наведи на страницу → Редактировать (Markdown) / Открыть · Перетащи для сортировки
      </div>
      <div id="adm-sections" style="flex:1;overflow-y:auto;padding:6px;position:relative" class="adm-scroll"></div>
    `;
    container.querySelector('#adm-reload').addEventListener('click', load);
    renderSections();
  }

  function renderSections() {
    const sectEl = container.querySelector('#adm-sections');
    if (!sectEl) return;
    const t = getT();
    sectEl.innerHTML = '';
    if (!nav.length) {
      sectEl.innerHTML = `<div style="padding:32px;text-align:center;color:${t.fgMuted};font-size:12px;font-family:${t.mono}">Нет разделов</div>`;
      return;
    }
    nav.forEach(s => sectEl.appendChild(makeSectionEl(s)));
  }

  function makeSectionEl(section) {
    const t = getT(), isOpen = expanded[section.id] !== false;
    const wrap = document.createElement('div');
    wrap.style.cssText = `margin-bottom:4px;border-radius:8px;border:1px solid ${t.border};overflow:hidden`;

    const hdr = document.createElement('div');
    hdr.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 10px;background:${t.surface};cursor:pointer;user-select:none`;
    hdr.innerHTML = `
      <span style="color:${t.fgSub};flex-shrink:0;transition:transform 0.2s;transform:rotate(${isOpen ? 0 : -90}deg)">${IC.chevD}</span>
      <span style="color:${t.fgMuted};flex-shrink:0">${IC.folder}</span>
      <span style="flex:1;font-size:12px;font-weight:600;color:${t.fg};font-family:${t.mono}">${esc(section.title)}</span>
      <span style="font-size:10px;color:${t.fgSub};background:${t.surfaceHov};border-radius:10px;padding:1px 7px;font-family:${t.mono}">${section.pages?.length ?? 0}</span>
    `;

    const body = document.createElement('div');
    body.style.cssText = `display:${isOpen ? 'block' : 'none'};border-top:1px solid ${t.border}`;

    // Drop-зона
    const dropZone = document.createElement('div');
    dropZone.style.cssText = `min-height:4px;transition:all 0.15s`;
    let dh = null;
    const setDrop = on => {
      dropZone.style.cssText = `min-height:${on ? '32px' : '4px'};background:${on ? 'rgba(124,92,252,0.08)' : 'transparent'};border-radius:6px;transition:all 0.15s;display:flex;align-items:center;justify-content:center`;
      if (on && !dh) { dh = document.createElement('div'); dh.style.cssText = `font-size:10px;color:rgba(124,92,252,0.7);font-family:${t.mono};pointer-events:none`; dh.textContent = `↓ В «${section.title}»`; dropZone.appendChild(dh); }
      else if (!on && dh) { dh.remove(); dh = null; }
    };
    dropZone.addEventListener('dragover', e => { if (!dragState) return; e.preventDefault(); setDrop(true); });
    dropZone.addEventListener('dragleave', () => setDrop(false));
    dropZone.addEventListener('drop', e => { e.preventDefault(); setDrop(false); if (!dragState) return; movePage(dragState.pageHref, dragState.fromSectionId, section.id); dragState = null; });

    (section.pages || []).forEach(page => body.appendChild(makePageEl(page, section.id)));
    if (!section.pages?.length) {
      const emp = document.createElement('div');
      emp.style.cssText = `padding:10px 14px;font-size:11px;color:${t.fgSub};font-family:${t.mono}`;
      emp.textContent = 'Перетащи сюда страницу';
      body.appendChild(emp);
    }
    body.appendChild(dropZone);

    hdr.addEventListener('click', () => {
      expanded[section.id] = !isOpen;
      hdr.querySelector('span:first-child').style.transform = expanded[section.id] ? 'rotate(0deg)' : 'rotate(-90deg)';
      body.style.display = expanded[section.id] ? 'block' : 'none';
    });

    wrap.appendChild(hdr); wrap.appendChild(body);
    return wrap;
  }

  function makePageEl(page, sectionId) {
    const t = getT();
    // Slug из href: /pages/onepage.html → onepage
    const slug = page.href.replace(/^.*\//, '').replace(/\.html$/, '');

    const row = document.createElement('div');
    row.draggable = true;
    row.style.cssText = `display:flex;align-items:center;gap:8px;padding:7px 10px 7px 14px;border-bottom:1px solid ${t.border};background:${t.bg};transition:background 0.1s`;
    row.innerHTML = `
      <span style="color:${t.fgSub};flex-shrink:0;cursor:grab">${IC.grip}</span>
      <span style="color:${t.fgSub};flex-shrink:0">${IC.file}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;color:${t.fg};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:${t.mono}">${esc(page.title)}</div>
        <div style="font-size:10px;color:${t.fgSub};font-family:${t.mono}">docs/${slug}.md</div>
      </div>
      <div class="adm-acts" style="display:none;gap:3px;align-items:center">
        <button class="adm-edit-btn" style="display:flex;align-items:center;gap:3px;padding:4px 8px;border-radius:5px;border:1px solid ${t.borderStrong};background:${t.surfaceHov};color:${t.fg};cursor:pointer;font-size:10px;font-family:${t.mono};font-weight:600">${IC.edit} Редактировать</button>
        <a href="${esc(page.href)}" target="_blank" style="display:flex;align-items:center;padding:4px 6px;border-radius:5px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};text-decoration:none">${IC.link}</a>
      </div>
    `;

    row.addEventListener('mouseenter', () => { row.style.background = t.surfaceHov; row.querySelector('.adm-acts').style.display = 'flex'; });
    row.addEventListener('mouseleave', () => { row.style.background = t.bg;         row.querySelector('.adm-acts').style.display = 'none'; });

    row.querySelector('.adm-edit-btn').addEventListener('click', e => {
      e.stopPropagation();
      const sectEl = container.querySelector('#adm-sections');
      openMdEditor(sectEl, slug, page.title, null);
    });

    // Drag
    row.addEventListener('dragstart', e => { dragState = { pageHref: page.href, fromSectionId: sectionId }; e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); setTimeout(() => { row.style.opacity = '0.4'; }, 0); });
    row.addEventListener('dragend',   () => { row.style.opacity = '1'; dragState = null; container.querySelectorAll('.adm-drop-indicator').forEach(el => el.remove()); });
    row.addEventListener('dragover',  e => {
      if (!dragState) return; e.preventDefault(); e.stopPropagation();
      container.querySelectorAll('.adm-drop-indicator').forEach(el => el.remove());
      const line = document.createElement('div'); line.className = 'adm-drop-indicator'; line.style.cssText = `height:2px;background:rgba(124,92,252,0.8);margin:0 8px;border-radius:2px`;
      row.parentNode.insertBefore(line, row);
    });
    row.addEventListener('dragleave', e => { if (!row.contains(e.relatedTarget)) container.querySelectorAll('.adm-drop-indicator').forEach(el => el.remove()); });
    row.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      container.querySelectorAll('.adm-drop-indicator').forEach(el => el.remove());
      if (!dragState) return; movePage(dragState.pageHref, dragState.fromSectionId, sectionId, page.href); dragState = null;
    });

    return row;
  }

  load();
}