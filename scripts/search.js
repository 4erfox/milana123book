/**
 * public/scripts/search.js
 * Полнотекстовый поиск: по названию страницы + по содержимому MD файлов
 */

let allPages = []; // { title, href, section, text }

// ─── Загрузка страниц + содержимого MD ───────────────────────────────────────

async function loadPages() {
  try {
    const res = await fetch('/data/nav.json');
    const nav = await res.json();
    const pages = nav.flatMap(section =>
      section.pages.map(p => ({
        title:   p.title,
        href:    p.href,
        section: section.title,
        slug:    p.href.replace(/^.*\/([^/]+)\.html$/, '$1'),
        text:    '', // заполним ниже
      }))
    );

    // Загружаем MD файлы параллельно (не блокируем UI)
    await Promise.allSettled(
      pages.map(async p => {
        try {
          const r = await fetch(`/docs/${p.slug}.md`);
          if (!r.ok) return;
          const md = await r.text();
          // Убираем frontmatter и markdown-разметку, оставляем чистый текст
          p.text = md
            .replace(/^---[\s\S]*?---\n/m, '')        // frontmatter
            .replace(/#{1,6}\s+/g, ' ')                // заголовки
            .replace(/[*_`~>]/g, '')                   // markdown символы
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // ссылки
            .replace(/\s+/g, ' ')
            .trim();
          // НЕ приводим к нижнему регистру здесь — это делает normalize() при поиске
          // Сохраняем оригинал чтобы сниппет отображался с правильными буквами
        } catch { /* файл не найден — пропускаем */ }
      })
    );

    allPages = pages;
  } catch {
    allPages = [];
  }
}

// ─── История просмотров ───────────────────────────────────────────────────────

const HISTORY_KEY = 'search_history';
const HISTORY_MAX = 5;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function addToHistory(page) {
  let h = getHistory().filter(p => p.href !== page.href);
  h.unshift(page);
  if (h.length > HISTORY_MAX) h = h.slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

// ─── Поиск ────────────────────────────────────────────────────────────────────

// Нормализация: ё→е, приведение к нижнему регистру
function normalize(str) {
  return str.toLowerCase().replace(/ё/g, 'е');
}

function search(query) {
  const q = normalize(query.trim());
  if (!q) return [];

  // Разбиваем на слова — каждое слово должно встречаться в тексте
  const words = q.split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return [];

  return allPages
    .map(p => {
      const titleN   = normalize(p.title);
      const sectionN = normalize(p.section || '');
      const textN    = normalize(p.text || '');

      // Считаем сколько слов нашлось в каждой зоне
      const titleHits   = words.filter(w => titleN.includes(w)).length;
      const sectionHits = words.filter(w => sectionN.includes(w)).length;
      const textHits    = words.filter(w => textN.includes(w)).length;

      // Хотя бы одно слово должно найтись
      if (!titleHits && !sectionHits && !textHits) return null;

      // Приоритет: заголовок > раздел > текст; больше совпавших слов = выше
      const score = titleHits * 10 + sectionHits * 5 + textHits;

      // Сниппет — берём первое найденное слово в тексте
      let snippet = '';
      if (textHits && !titleHits) {
        const foundWord = words.find(w => textN.includes(w));
        const idx = textN.indexOf(foundWord);
        const start = Math.max(0, idx - 30);
        const end   = Math.min(textN.length, idx + foundWord.length + 70);
        // Берём из оригинального текста (не нормализованного) чтобы сохранить ё
        const origSlice = (p.text || '').slice(start, end);
        // Выделяем найденное слово в сниппете
        const reSnippet = new RegExp(foundWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        snippet = (start > 0 ? '…' : '') +
                  origSlice.replace(reSnippet, '<mark>$&</mark>') +
                  (end < (p.text || '').length ? '…' : '');
        snippet = snippet.charAt(0).toUpperCase() + snippet.slice(1);
      }

      return { ...p, score, snippet };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

// ─── Модальное окно ───────────────────────────────────────────────────────────

function createModal() {
  const modal = document.createElement('div');
  modal.id = 'search-modal';
  modal.innerHTML = `
    <div class="search-backdrop"></div>
    <div class="search-dialog" role="dialog" aria-modal="true" aria-label="Поиск">
      <div class="search-input-wrap">
        <svg class="srch-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="search-input" type="text" placeholder="Поиск по страницам и содержимому..." autocomplete="off" spellcheck="false"/>
        <kbd class="srch-esc">Esc</kbd>
      </div>
      <div id="search-results" class="srch-results"></div>
      <div class="srch-footer">
        <span><kbd>↑↓</kbd> навигация</span>
        <span><kbd>↵</kbd> открыть</span>
        <span><kbd>Esc</kbd> закрыть</span>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.search-backdrop').addEventListener('click', closeSearch);
  modal.querySelector('#search-results').addEventListener('click', e => {
    const item = e.target.closest('.srch-item');
    if (!item) return;
    e.preventDefault();
    addToHistory({ title: item.dataset.title, href: item.dataset.href, section: item.dataset.section });
    closeSearch();
    window.location.href = item.dataset.href;
  });
  return modal;
}

// ─── Рендер ───────────────────────────────────────────────────────────────────

function highlightText(text, query) {
  if (!query || !text) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

function renderItems(items, query, label) {
  if (!items.length) return '';
  return `<div class="srch-label">${label}</div>` +
    items.map((p, idx) => `
      <a href="${p.href}" class="srch-item" data-idx="${idx}" data-href="${p.href}" data-title="${p.title}" data-section="${p.section || ''}">
        <span class="srch-item-body">
          <span class="srch-item-title">${highlightText(p.title, query)}</span>
          ${p.section ? `<span class="srch-item-section">${p.section}</span>` : ''}
          ${p.snippet ? `<span class="srch-snippet">${p.snippet}</span>` : ''}
        </span>
        <svg class="srch-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </a>`).join('');
}

function showResults(query) {
  const container = document.getElementById('search-results');
  if (!container) return;

  let html = '';
  if (!query.trim()) {
    const history = getHistory();
    html = history.length
      ? renderItems(history, '', 'Недавно открытые')
      : `<p class="srch-empty">Начните вводить запрос — ищем по заголовкам и тексту страниц</p>`;
  } else {
    const results = search(query);
    html = results.length
      ? renderItems(results, query, `Результаты (${results.length})`)
      : `<p class="srch-empty">Ничего не найдено по запросу «${query}»</p>`;
  }

  container.innerHTML = html;
  currentIdx = -1;
}

// ─── Навигация клавишами ─────────────────────────────────────────────────────

let currentIdx = -1;

function getItems() {
  return Array.from(document.querySelectorAll('#search-results .srch-item'));
}

function setActive(idx) {
  const items = getItems();
  items.forEach(el => el.classList.remove('active'));
  if (idx >= 0 && idx < items.length) {
    items[idx].classList.add('active');
    items[idx].scrollIntoView({ block: 'nearest' });
    currentIdx = idx;
  } else {
    currentIdx = -1;
  }
}

// ─── Открытие / закрытие ─────────────────────────────────────────────────────

let modal = null;
let isOpen = false;

function openSearch() {
  if (!modal) modal = createModal();
  modal.classList.add('open');
  isOpen = true;
  document.body.style.overflow = 'hidden';
  const input = document.getElementById('search-input');
  if (input) { input.value = ''; input.focus(); }
  showResults('');
}

function closeSearch() {
  if (!modal) return;
  modal.classList.remove('open');
  isOpen = false;
  document.body.style.overflow = '';
}

// ─── Слушатели ───────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
      (e.key === '/' && !isOpen && document.activeElement.tagName !== 'INPUT')) {
    e.preventDefault(); openSearch(); return;
  }
  if (!isOpen) return;
  if (e.key === 'Escape') { closeSearch(); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(currentIdx + 1, getItems().length - 1)); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(Math.max(currentIdx - 1, 0)); }
  if (e.key === 'Enter') {
    e.preventDefault();
    const items = getItems();
    const active = currentIdx >= 0 ? items[currentIdx] : items[0];
    if (active) active.click();
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'search-input') showResults(e.target.value);
});

function bindSearchBtn() {
  const btn = document.getElementById('search-btn');
  if (btn) {
    btn.addEventListener('click', e => { e.stopPropagation(); openSearch(); });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindSearchBtn);
} else {
  bindSearchBtn();
}

// ─── Инициализация ───────────────────────────────────────────────────────────

loadPages();

// ─── Стили ───────────────────────────────────────────────────────────────────

const style = document.createElement('style');
style.textContent = `
#search-modal {
  display: none; position: fixed; inset: 0; z-index: 9999;
  align-items: flex-start; justify-content: center;
  padding-top: 80px; padding-left: 1rem; padding-right: 1rem;
}
#search-modal.open { display: flex; }

.search-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
}

.search-dialog {
  position: relative; width: 100%; max-width: 600px;
  background: #fff; border-radius: 12px; border: 1px solid #E5E5E5;
  overflow: hidden; max-height: calc(100vh - 120px);
  display: flex; flex-direction: column;
}

.search-input-wrap {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; border-bottom: 1px solid #E5E5E5; flex-shrink: 0;
}
.srch-icon { width: 18px; height: 18px; color: #6B6B6B; flex-shrink: 0; }

#search-input {
  flex: 1; border: none; outline: none;
  font-size: 15px; font-family: 'Inter', sans-serif;
  color: #1A1A1A; background: transparent; line-height: 1.5;
}
#search-input::placeholder { color: #6B6B6B; }

.srch-esc {
  font-size: 11px; color: #6B6B6B; background: #F5F5F4;
  border: 1px solid #E5E5E5; border-radius: 4px; padding: 2px 6px;
  font-family: 'Inter', sans-serif;
}

.srch-results { overflow-y: auto; padding: 8px 8px 4px; flex: 1; }

.srch-label {
  font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: #6B6B6B; padding: 4px 8px 6px;
}

.srch-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px;
  text-decoration: none; cursor: pointer;
  transition: background 0.15s;
}
.srch-item:hover, .srch-item.active { background: #FFF5F2; }

.srch-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }

.srch-item-title {
  font-size: 14px; font-weight: 500;
  font-family: 'Inter', sans-serif; color: #1A1A1A;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.srch-item-title mark {
  background: rgba(193,80,46,0.15); color: #C1502E;
  border-radius: 2px; padding: 0 1px;
}

.srch-item-section {
  font-size: 11px; font-family: 'Inter', sans-serif;
  color: #C1502E; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.srch-snippet {
  font-size: 12px; font-family: 'Inter', sans-serif; color: #6B6B6B;
  font-style: italic; line-height: 1.4;
  overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.srch-snippet mark {
  background: rgba(193,80,46,0.15); color: #C1502E;
  border-radius: 2px; padding: 0 1px; font-style: normal;
}

.srch-chevron { width: 14px; height: 14px; color: #C0C0C0; flex-shrink: 0; }

.srch-empty {
  font-family: 'Inter', sans-serif; font-size: 14px;
  color: #6B6B6B; text-align: center; padding: 2rem 1rem;
}

.srch-footer {
  display: flex; align-items: center; gap: 16px;
  padding: 8px 16px; border-top: 1px solid #E5E5E5; flex-shrink: 0;
}
.srch-footer span {
  font-size: 12px; font-family: 'Inter', sans-serif; color: #6B6B6B;
  display: flex; align-items: center; gap: 4px;
}
.srch-footer kbd {
  background: #F5F5F4; border: 1px solid #E5E5E5; border-radius: 4px;
  padding: 1px 5px; font-size: 11px; font-family: 'Inter', sans-serif;
}

@media (max-width: 600px) {
  #search-modal { padding-top: 20px; }
  .srch-footer { display: none; }
}
`;
document.head.appendChild(style);