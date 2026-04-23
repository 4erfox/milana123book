/**
 * generate-pages.js
 * Генерирует public/pages/*.html — тонкие заглушки которые
 * подключают md-renderer.js и передают ему slug страницы.
 *
 * Запуск: node generate-pages.js
 * Запускать после добавления новых .md файлов в docs/
 */

const fs   = require('fs');
const path = require('path');

const DOCS_DIR  = path.join(__dirname, 'public', 'docs');
const PAGES_DIR = path.join(__dirname, 'public', 'pages');

fs.mkdirSync(PAGES_DIR, { recursive: true });

const mdFiles = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));

function getTitle(mdPath) {
  const text  = fs.readFileSync(mdPath, 'utf8');
  const match = text.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  return match ? match[1] : path.basename(mdPath, '.md');
}

let count = 0;
for (const mdFile of mdFiles) {
  const slug    = path.basename(mdFile, '.md');
  const title   = getTitle(path.join(DOCS_DIR, mdFile));
  const outPath = path.join(PAGES_DIR, `${slug}.html`);

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — Деловой этикет в Казахстане</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Literata:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/styles/layout.css">
</head>
<body>
    <header class="header">
        <div class="header-container">
            <a href="/" class="logo">etiquette-book</a>
            <a href="/" class="back-btn">
                <svg viewBox="0 0 24 24">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                </svg>
                Назад
            </a>
        </div>
    </header>

    <div class="page-wrapper">
        <aside class="toc-sidebar" id="toc-sidebar">
            <nav>
                <h3 class="toc-title">На этой странице</h3>
                <ul class="toc-list" id="toc-list"></ul>
            </nav>
        </aside>
        <main class="main-content" id="main-content">
            <div style="padding:3rem;text-align:center;color:#999">Загрузка...</div>
        </main>
    </div>

    <script>window.__PAGE_SLUG__ = '${slug}';</script>
    <script type="module" src="/scripts/pages.js"></script>
    <script type="module" src="/scripts/md-renderer.js"></script>
</body>
</html>`;

  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`✓ pages/${slug}.html`);
  count++;
}

console.log(`\nГотово: ${count} страниц в public/pages/`);