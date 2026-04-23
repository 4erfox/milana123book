/**
 * /scripts/md-renderer.js
 * Читает MD файл из /docs/ и рендерит его в страницу
 * Подключается на page.html
 */

(async function () {
  // ── Определяем какой MD файл загружать ─────────────────────────────────────
  // URL вида: /page.html?p=onepage  или  /pages/onepage.html (редирект)
  const params = new URLSearchParams(location.search);
  let slug = params.get("p") || window.__PAGE_SLUG__;

  // Если slug не задан — берём из пути (для совместимости со старыми ссылками)
  if (!slug) {
    const pathMatch = location.pathname.match(/\/pages\/([^/]+)\.html$/);
    if (pathMatch) slug = pathMatch[1];
  }

  if (!slug) {
    showError('Страница не найдена. Укажите параметр ?p=название');
    return;
  }

  // ── Загружаем MD файл ───────────────────────────────────────────────────────
  let mdText;
  try {
    const res = await fetch(`/docs/${slug}.md?t=${Date.now()}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    mdText = await res.text();
  } catch (e) {
    showError(`Не удалось загрузить /docs/${slug}.md — ${e.message}`);
    return;
  }

  // ── Парсим front matter ─────────────────────────────────────────────────────
  const fm   = parseFrontMatter(mdText);
  const body = fm.body;

  // ── Обновляем мета-теги страницы ────────────────────────────────────────────
  document.title = `${fm.title} — Деловой этикет в Казахстане`;
  if (fm.description) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = fm.description;
  }

  // ── Рендерим TOC ────────────────────────────────────────────────────────────
  const tocList = document.getElementById('toc-list');
  if (tocList && fm.toc && fm.toc.length > 0) {
    tocList.innerHTML = fm.toc.map((item, i) =>
      `<li><a href="#${item.id}" class="toc-link ${i === 0 ? 'active' : ''}">${item.label}</a></li>`
    ).join('');
  } else if (tocList) {
    // Генерируем TOC из заголовков
    const headings = extractHeadings(body);
    tocList.innerHTML = headings.map((h, i) =>
      `<li><a href="#${h.id}" class="toc-link ${i === 0 ? 'active' : ''}">${h.text}</a></li>`
    ).join('');
  }

  // ── Рендерим контент ────────────────────────────────────────────────────────
  const main = document.getElementById('main-content');
  if (!main) return;

  // Хлебные крошки
  const sectionLabels = {
    intro:     'Введение',
    basics:    'Основы делового этикета',
    meetings:  'Деловые встречи',
    culture:   'Деловая культура Казахстана',
    online:    'Онлайн-коммуникация',
    conflicts: 'Конфликты и сложные ситуации',
  };
  const sectionLabel = sectionLabels[fm.section] || fm.section || '';
  const sectionId    = fm.section || '';

  // Если body начинается не с ## — добавляем первую секцию из TOC
  let processedBody = body;
  const firstTocId = fm.toc && fm.toc.length > 0 ? fm.toc[0].id : null;
  if (firstTocId && !body.trimStart().startsWith('## ')) {
    processedBody = `<!-- intro-section:${firstTocId} -->
` + body;
  }

  main.innerHTML = `
    <div class="page-header">
      <div class="breadcrumb">
        <a href="/">Главная</a>${sectionLabel ? ` / <a href="/#${sectionId}">${sectionLabel}</a>` : ''} / ${fm.title}
      </div>
      <h1 class="page-title">${fm.title}</h1>
      <div class="page-meta">
        <span>Время чтения: ${fm.read_time || '10 минут'}</span>
        <span>•</span>
        <span>${fm.chapter || ''}</span>
      </div>
    </div>
    <div id="md-content">${renderMarkdown(processedBody, fm.toc.map(t => t.id))}</div>
  `;

  // ── Запускаем pages.js логику (TOC подсветка при скролле) ──────────────────
  initTocScroll();
})();

// ══════════════════════════════════════════════════════════════════════════════
// ПАРСЕР FRONT MATTER
// ══════════════════════════════════════════════════════════════════════════════

function parseFrontMatter(text) {
  const result = { title: '', description: '', section: '', read_time: '', chapter: '', toc: [], body: text };
  if (!text.startsWith('---')) return result;

  const end = text.indexOf('\n---', 3);
  if (end === -1) return result;

  const fmText = text.slice(3, end).trim();
  result.body  = text.slice(end + 4).trim();

  // Парсим YAML вручную (без зависимостей)
  const lines = fmText.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) { i++; continue; }

    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');

    if (key === 'toc') {
      // Парсим список TOC
      i++;
      while (i < lines.length && lines[i].match(/^\s+-?\s*(id:|label:)/)) {
        const idM  = lines[i].match(/id:\s*(.+)/);
        const lblM = lines[i + 1]?.match(/label:\s*["']?(.+?)["']?$/);
        if (idM && lblM) {
          result.toc.push({ id: idM[1].trim(), label: lblM[1].trim() });
          i += 2;
        } else { i++; }
      }
      continue;
    }

    if (key in result) result[key] = val;
    i++;
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// MARKDOWN → HTML РЕНДЕРЕР
// ══════════════════════════════════════════════════════════════════════════════

function renderMarkdown(md, tocIds) {
  const lines  = md.split('\n');
  const html   = [];
  let i        = 0;
  let sectionIdx = 0;
  let inSection = false;

  function closeSection() {
    if (inSection) { html.push('</section>'); inSection = false; }
  }

  while (i < lines.length) {
    const line = lines[i];

    // ── Специальный маркер intro-секции ─────────────────────────────────
    if (line.startsWith('<!-- intro-section:')) {
      closeSection();
      const introId = line.match(/<!-- intro-section:([^>]+) -->/)?.[1] || 'introduction';
      html.push(`<section id="${introId}" class="content-section">`);
      inSection = true;
      sectionIdx++;
      i++; continue;
    }

    // ── H2 — открывает новую секцию ─────────────────────────────────────────
    if (line.startsWith('## ')) {
      closeSection();
      const text = line.slice(3).trim();
      const sectionId = (tocIds && tocIds[sectionIdx]) ? tocIds[sectionIdx] : slugifyId(text);
      sectionIdx++;
      html.push(`<section id="${sectionId}" class="content-section">`);
      html.push(`<h2 class="section-title">${inlineRender(text)}</h2>`);
      inSection  = true;
      i++; continue;
    }

    // ── H3 ──────────────────────────────────────────────────────────────────
    if (line.startsWith('### ')) {
      html.push(`<h3 class="subsection-title">${inlineRender(line.slice(4).trim())}</h3>`);
      i++; continue;
    }

    // ── H4 ──────────────────────────────────────────────────────────────────
    if (line.startsWith('#### ')) {
      html.push(`<h4 class="subsection-title">${inlineRender(line.slice(5).trim())}</h4>`);
      i++; continue;
    }

    // ── Blockquote (info-box) ────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      const qLines = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        qLines.push(lines[i].slice(2));
        i++;
      }
      html.push(renderBlockquote(qLines));
      continue;
    }

    // ── Список (ul) ──────────────────────────────────────────────────────────
    if (line.match(/^- .+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^- .+/)) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      html.push('<ul class="content-list">');
      items.forEach(it => html.push(`<li>${inlineRender(it)}</li>`));
      html.push('</ul>');
      continue;
    }

    // ── Нумерованный список ──────────────────────────────────────────────────
    if (line.match(/^\d+\. .+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. .+/)) {
        items.push(lines[i].replace(/^\d+\. /, '').trim());
        i++;
      }
      html.push('<ol class="content-list">');
      items.forEach(it => html.push(`<li>${inlineRender(it)}</li>`));
      html.push('</ol>');
      continue;
    }

    // ── Изображение ──────────────────────────────────────────────────────────
    if (line.match(/^!\[/)) {
      const m = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (m) {
        html.push(`<figure class="content-figure"><img src="${m[2]}" alt="${m[1]}"><figcaption>${m[1]}</figcaption></figure>`);
      }
      i++; continue;
    }

    // ── Горизонтальная линия ─────────────────────────────────────────────────
    if (line.trim() === '---') { html.push('<hr>'); i++; continue; }

    // ── Пустая строка ────────────────────────────────────────────────────────
    if (line.trim() === '') { i++; continue; }

    // ── Обычный абзац ────────────────────────────────────────────────────────
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^#{1,4} /) && !lines[i].startsWith('> ') && !lines[i].match(/^- /) && !lines[i].match(/^\d+\. /)) {
      paraLines.push(lines[i]);
      i++;
    }
    const paraText = paraLines.join(' ').trim();
    if (paraText) html.push(`<p class="section-text">${inlineRender(paraText)}</p>`);
  }

  closeSection();
  return html.join('\n');
}

// ── Blockquote → info-box или quote-block ────────────────────────────────────
function renderBlockquote(lines) {
  // Если первая строка начинается с ** — это info-box с заголовком
  const firstLine = lines[0] || '';
  const isInfoBox = firstLine.startsWith('**') || lines.some(l => l.startsWith('- '));

  if (isInfoBox) {
    const parts = ['<div class="info-box">'];
    let titleDone = false;
    const listItems = [];
    let hasTitle = false;

    lines.forEach(l => {
      if (l.startsWith('**') && !titleDone) {
        const t = l.replace(/\*\*/g, '').trim().replace(/:$/, '');
        parts.push(`<h3 class="info-box-title">${t}</h3>`);
        titleDone = true; hasTitle = true;
      } else if (l.startsWith('- ')) {
        listItems.push(l.slice(2).trim());
      } else if (l.trim()) {
        parts.push(`<p class="section-text">${inlineRender(l)}</p>`);
      }
    });

    if (listItems.length > 0) {
      parts.push('<ul class="info-list">');
      listItems.forEach(it => parts.push(`<li>${inlineRender(it)}</li>`));
      parts.push('</ul>');
    }

    parts.push('</div>');
    return parts.join('\n');
  } else {
    // Обычная цитата
    const text = lines.map(l => l.replace(/^\*(.+)\*$/, '$1')).join(' ');
    return `<div class="quote-block"><p>${inlineRender(text)}</p></div>`;
  }
}

// ── Inline рендеринг: **bold**, *italic*, `code`, [link](url) ────────────────
function inlineRender(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em>$1</em>')
    .replace(/`([^`]+)`/g,         '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

// ── Из текста заголовка делаем id ────────────────────────────────────────────
function slugifyId(text) {
  return text.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-zа-яё0-9-]/gi, '')
    .replace(/-+/g, '-');
}

// ── Извлечь заголовки для автогенерации TOC ──────────────────────────────────
function extractHeadings(md) {
  const headings = [];
  md.split('\n').forEach(line => {
    const m = line.match(/^## (.+)/);
    if (m) headings.push({ id: slugifyId(m[1].trim()), text: m[1].trim() });
  });
  return headings;
}

// ── TOC подсветка при скролле ────────────────────────────────────────────────
function initTocScroll() {
  // Ждём пока DOM обновится после рендера
  requestAnimationFrame(() => {
    const tocLinks = document.querySelectorAll('.toc-link');
    const sections = document.querySelectorAll('.content-section');
    if (!tocLinks.length || !sections.length) return;

    // Клик по TOC — плавный скролл
    tocLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const id = link.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (target) {
          window.scrollTo({ top: target.offsetTop - 100, behavior: 'smooth' });
        }
      });
    });

    // Подсветка активного пункта при скролле
    function updateActive() {
      const scrollY = window.scrollY;
      let current = '';
      sections.forEach(sec => {
        if (scrollY >= sec.offsetTop - 150) current = sec.id;
      });
      tocLinks.forEach(link => {
        const isActive = link.getAttribute('href') === '#' + current;
        link.classList.toggle('active', isActive);
      });
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive(); // запускаем сразу
  });
}

// ── Показать ошибку ──────────────────────────────────────────────────────────
function showError(msg) {
  const main = document.getElementById('main-content');
  if (main) main.innerHTML = `<div style="padding:3rem;color:#c0392b;font-family:sans-serif"><h2>Ошибка</h2><p>${msg}</p><a href="/">← На главную</a></div>`;
  document.title = 'Ошибка — Деловой этикет';
}