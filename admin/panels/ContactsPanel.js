/**
 * admin/panels/ContactsPanel.js — управление контактами сайта
 */

import { bridge } from '../bridge.js';
import { toast } from '../toast.js';
import { getT } from '../theme.js';

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function parseContacts(raw) {
  try { return JSON.parse(raw); }
  catch { return []; }
}

function serializeContacts(contacts) {
  return JSON.stringify(contacts, null, 2);
}

export function renderContactsPanel(container) {
  const t = getT();
  let contacts = [];
  let dirty = false;

  async function load() {
    try {
      const { content } = await bridge.readContacts();
      contacts = parseContacts(content);
      render();
    } catch(e) {
      // Если файл не существует — начинаем с пустого списка
      contacts = [];
      render();
    }
  }

  async function save() {
    try {
      await bridge.writeContacts(serializeContacts(contacts));
      dirty = false;
      toast.success('Контакты сохранены');
      renderFooter();
    } catch(e) { toast.error(e.message); }
  }

  function addContact() {
    contacts.push({ href: '', title: '', subtitle: '', external: true });
    dirty = true;
    render();
  }

  function deleteContact(i) {
    contacts.splice(i, 1);
    dirty = true;
    render();
  }

  function updateContact(i, field, value) {
    contacts[i][field] = value;
    dirty = true;
    renderFooter();
  }

  function renderFooter() {
    const footer = container.querySelector('#adm-contacts-footer');
    if (!footer) return;
    footer.innerHTML = `
      <button id="adm-contacts-reload" style="display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:7px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};cursor:pointer;font-size:11px;font-family:${t.mono}">Обновить</button>
      <button id="adm-contacts-save" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 12px;border-radius:7px;border:1px solid ${dirty ? t.borderStrong : t.border};background:${dirty ? t.surfaceHov : 'transparent'};color:${dirty ? t.fg : t.fgMuted};cursor:pointer;font-size:11px;font-weight:${dirty ? 500 : 400};font-family:${t.mono}">
        Сохранить${dirty ? ' ●' : ''}
      </button>
    `;
    footer.querySelector('#adm-contacts-reload').onclick = load;
    footer.querySelector('#adm-contacts-save').onclick = save;
  }

  function render() {
    const t = getT();
    container.innerHTML = `
      <div style="flex:1;overflow-y:auto;padding:10px 12px" class="adm-scroll" id="adm-contacts-list"></div>
      <div id="adm-contacts-footer" style="padding:8px 12px;border-top:1px solid ${t.border};background:${t.surface};flex-shrink:0;display:flex;gap:8px"></div>
    `;

    const list = container.querySelector('#adm-contacts-list');

    contacts.forEach((c, i) => {
      const row = document.createElement('div');
      row.style.cssText = `border:1px solid ${t.border};border-radius:8px;margin-bottom:8px;overflow:hidden`;
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:${t.surface};border-bottom:1px solid ${t.border}">
          <span style="font-size:10px;color:${t.fgSub};font-family:${t.mono}">#${i+1}</span>
          <span style="flex:1;font-size:11px;color:${t.fg};font-weight:500">${escHtml(c.title) || 'Без названия'}</span>
          <span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${t.surfaceHov};color:${t.fgMuted}">${c.href?.startsWith('mailto:') ? 'email' : 'external'}</span>
          <button class="adm-del-contact" data-i="${i}" style="display:flex;padding:3px;border-radius:4px;border:none;background:transparent;color:${t.fgSub};cursor:pointer">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
        <div style="padding:8px 10px;display:flex;flex-direction:column;gap:5px">
          <div style="display:flex;gap:6px">
            <input class="adm-ct-field" data-i="${i}" data-field="title" placeholder="Название (GitHub, Telegram...)" value="${escHtml(c.title)}"
              style="flex:1;padding:5px 8px;border-radius:5px;border:1px solid ${t.border};background:${t.inpBg};color:${t.fg};font-size:11px;outline:none;font-family:${t.mono};min-width:0">
            <input class="adm-ct-field" data-i="${i}" data-field="subtitle" placeholder="Подпись" value="${escHtml(c.subtitle)}"
              style="flex:1;padding:5px 8px;border-radius:5px;border:1px solid ${t.border};background:${t.inpBg};color:${t.fg};font-size:11px;outline:none;font-family:${t.mono};min-width:0">
          </div>
          <input class="adm-ct-field" data-i="${i}" data-field="href" placeholder="https://... или mailto:..." value="${escHtml(c.href)}"
            style="width:100%;padding:5px 8px;border-radius:5px;border:1px solid ${t.border};background:${t.inpBg};color:${t.fg};font-size:11px;outline:none;font-family:${t.mono};box-sizing:border-box">
        </div>
      `;
      list.appendChild(row);
    });

    // Кнопка добавить
    const addBtn = document.createElement('button');
    addBtn.style.cssText = `width:100%;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:7px;border:1px dashed ${t.border};background:transparent;color:${t.fgMuted};font-size:11px;cursor:pointer;font-family:${t.mono}`;
    addBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Добавить контакт`;
    addBtn.onclick = addContact;
    list.appendChild(addBtn);

    // Делегирование событий
    list.addEventListener('click', e => {
      const del = e.target.closest('.adm-del-contact');
      if (del) { deleteContact(parseInt(del.dataset.i)); }
    });
    list.addEventListener('input', e => {
      const inp = e.target.closest('.adm-ct-field');
      if (inp) { updateContact(parseInt(inp.dataset.i), inp.dataset.field, inp.value); }
    });

    renderFooter();
  }

  load();
}
