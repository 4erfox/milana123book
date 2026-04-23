/**
 * admin-server.js — WebSocket-бридж для Админ Панели etiquette-book
 * Запуск: node admin-server.js  (из корня проекта, рядом с public/)
 */

const http   = require('http');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const PUBLIC_DIR    = path.join(__dirname, 'public');
const PAGES_DIR     = path.join(PUBLIC_DIR, 'pages');
const DOCS_DIR      = path.join(PUBLIC_DIR, 'docs');
const CONTACTS_PATH = path.join(PUBLIC_DIR, 'data', 'contacts.json');
const NAV_PATH      = path.join(PUBLIC_DIR, 'data', 'nav.json');

// ─── WebSocket (RFC 6455, без зависимостей) ───────────────────────────────────

function wsHandshake(req, socket) {
  const accept = crypto
    .createHash('sha1')
    .update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    'Access-Control-Allow-Origin: *\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
}

function wsDecode(buf) {
  if (buf.length < 2) return null;
  const masked = (buf[1] & 0x80) !== 0;
  let len = buf[1] & 0x7f, off = 2;
  if (len === 126) { len = buf.readUInt16BE(2); off = 4; }
  else if (len === 127) { len = Number(buf.readBigUInt64BE(2)); off = 10; }
  if (buf.length < off + (masked ? 4 : 0) + len) return null;
  let payload = buf.slice(off + (masked ? 4 : 0), off + (masked ? 4 : 0) + len);
  if (masked) {
    const mask = buf.slice(off, off + 4);
    payload = Buffer.from(payload);
    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
  }
  return { opcode: buf[0] & 0x0f, payload, consumed: off + (masked ? 4 : 0) + len };
}

function wsEncode(data) {
  const p = Buffer.from(data, 'utf8'), n = p.length;
  let h;
  if (n < 126)      { h = Buffer.alloc(2);  h[0] = 0x81; h[1] = n; }
  else if (n < 65536){ h = Buffer.alloc(4);  h[0] = 0x81; h[1] = 126; h.writeUInt16BE(n, 2); }
  else              { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([h, p]);
}

// ─── Безопасность путей ───────────────────────────────────────────────────────

function safeAbs(p) {
  const abs = path.resolve(__dirname, p);
  if (!abs.startsWith(__dirname)) throw new Error('Path traversal denied');
  return abs;
}

// ─── Чтение title из HTML файла ───────────────────────────────────────────────

function htmlTitle(filename) {
  const fp = path.join(PAGES_DIR, filename);
  if (!fs.existsSync(fp)) return filename.replace('.html', '').replace(/-/g, ' ');
  const html = fs.readFileSync(fp, 'utf8');
  // Берём часть до " —" или "—" (разделитель у тебя в title)
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!m) return filename.replace('.html', '').replace(/-/g, ' ');
  return m[1].split(/[—–-]/)[0].trim();
}

// ─── Парсинг структуры из index.html ─────────────────────────────────────────

function parseNavFromIndex() {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) return null;

  const html = fs.readFileSync(indexPath, 'utf8');
  const sections = [];

  // Разбиваем по блокам menu-section
  const blocks = html.split(/<div\s+class="menu-section[^"]*"\s+data-section="([^"]+)"/);

  for (let i = 1; i < blocks.length; i += 2) {
    const sectionId = blocks[i];
    const block     = blocks[i + 1] || '';

    // Заголовок раздела
    const titleM = block.match(/class="menu-section-title-text"[^>]*>\s*([^<]+)\s*<\/span>/);
    if (!titleM) continue;
    const sectionTitle = titleM[1].trim();

    // Страницы раздела
    const pages = [];
    const hrefRe = /<a\s+href="([^"]+)"\s+class="[^"]*menu-item[^"]*"[^>]*>\s*([^<]+)\s*<\/a>/g;
    let m;
    while ((m = hrefRe.exec(block)) !== null) {
      const href  = m[1].trim();
      const title = m[2].trim();
      const name  = href.replace(/^.*\//, '');
      pages.push({ name, href, title });
    }

    sections.push({ id: sectionId, title: sectionTitle, pages });
  }

  return sections.length > 0 ? sections : null;
}

// ─── Получить / инициализировать nav ─────────────────────────────────────────

function getNav() {
  // Уже есть сохранённый — используем
  if (fs.existsSync(NAV_PATH)) {
    try {
      const saved = JSON.parse(fs.readFileSync(NAV_PATH, 'utf8'));
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
  }

  // Строим из index.html
  const fromIndex = parseNavFromIndex();
  if (fromIndex) {
    saveNav(fromIndex);
    return fromIndex;
  }

  // Фолбэк: всё в одной секции
  const files  = fs.existsSync(PAGES_DIR)
    ? fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.html'))
    : [];
  const fallback = [{
    id:    'pages',
    title: 'Страницы',
    pages: files.map(f => ({ name: f, href: `/pages/${f}`, title: htmlTitle(f) })),
  }];
  saveNav(fallback);
  return fallback;
}

function saveNav(nav) {
  fs.mkdirSync(path.dirname(NAV_PATH), { recursive: true });
  fs.writeFileSync(NAV_PATH, JSON.stringify(nav, null, 2), 'utf8');
  updateIndexHtml(nav);
}

function updateIndexHtml(nav) {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, 'utf8');

  const sectionsHtml = nav.map(function(section) {
    const itemsHtml = section.pages.map(function(page) {
      return '                    <a href="' + page.href + '" class="menu-item" style="text-decoration: none; color: inherit; display: block;">' + page.title + '</a>';
    }).join('\n');
    return [
      '            <div class="menu-section" data-section="' + section.id + '">',
      '                <div class="menu-section-title">',
      '                    <div class="menu-section-title-content">',
      '                        <span class="menu-section-title-text">' + section.title + '</span>',
      '                        <div class="menu-section-controls">',
      '                            <span class="menu-section-counter">' + section.pages.length + '</span>',
      '                            <div class="menu-section-arrow">',
      '                                <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>',
      '                            </div>',
      '                        </div>',
      '                    </div>',
      '                </div>',
      '                <div class="menu-items">',
      itemsHtml,
      '                </div>',
      '            </div>'
    ].join('\n');
  }).join('\n\n');

  const startTag = '<div class="sidebar-content">';
  const endTag   = '</aside>';
  const start    = html.indexOf(startTag);
  const end      = html.lastIndexOf(endTag);
  if (start === -1 || end === -1) return;

  html = html.slice(0, start) +
    startTag + '\n' + sectionsHtml + '\n        </div>\n    ' +
    html.slice(end);

  fs.writeFileSync(indexPath, html, 'utf8');
}

// ─── Все HTML файлы в public/pages/ ──────────────────────────────────────────

function getAllPages() {
  if (!fs.existsSync(PAGES_DIR)) return [];
  return fs.readdirSync(PAGES_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => ({ name: f, href: `/pages/${f}`, title: htmlTitle(f), path: `public/pages/${f}` }));
}

// ─── Обработчик ───────────────────────────────────────────────────────────────

function handle(msg) {
  const { id, action, payload } = msg;

  if (action === 'ping') return { id, ok: true };

  if (action === 'readFile') {
    const content = fs.readFileSync(safeAbs(payload.filePath), 'utf8');
    return { id, ok: true, result: { content } };
  }

  if (action === 'writeFile') {
    const abs = safeAbs(payload.filePath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, payload.content, 'utf8');
    return { id, ok: true, result: { written: payload.filePath } };
  }

  if (action === 'deleteFile') {
    const abs = safeAbs(payload.filePath);
    if (fs.existsSync(abs)) {
      fs.statSync(abs).isDirectory()
        ? fs.rmSync(abs, { recursive: true })
        : fs.unlinkSync(abs);
    }
    return { id, ok: true, result: { deleted: payload.filePath } };
  }

  if (action === 'listNav') {
    return { id, ok: true, result: { nav: getNav(), pages: getAllPages() } };
  }

  if (action === 'readDoc') {
    const docPath = path.join(DOCS_DIR, payload.slug + '.md');
    if (!fs.existsSync(docPath)) return { id, ok: false, error: 'Doc not found: ' + payload.slug };
    const content = fs.readFileSync(docPath, 'utf8');
    return { id, ok: true, result: { content } };
  }

  if (action === 'writeDoc') {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    const docPath = path.join(DOCS_DIR, payload.slug + '.md');
    fs.writeFileSync(docPath, payload.content, 'utf8');
    return { id, ok: true, result: { written: payload.slug } };
  }

  if (action === 'listDocs') {
    if (!fs.existsSync(DOCS_DIR)) return { id, ok: true, result: { docs: [] } };
    const docs = fs.readdirSync(DOCS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const slug = f.replace('.md', '');
        const text = fs.readFileSync(path.join(DOCS_DIR, f), 'utf8');
        const titleM = text.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        return { slug, title: titleM ? titleM[1] : slug };
      });
    return { id, ok: true, result: { docs } };
  }

  if (action === 'saveNav') {
    saveNav(payload.nav);
    return { id, ok: true, result: { ok: true } };
  }

  if (action === 'readContacts') {
    const content = fs.existsSync(CONTACTS_PATH)
      ? fs.readFileSync(CONTACTS_PATH, 'utf8')
      : '[]';
    return { id, ok: true, result: { content } };
  }

  if (action === 'writeContacts') {
    fs.mkdirSync(path.dirname(CONTACTS_PATH), { recursive: true });
    fs.writeFileSync(CONTACTS_PATH, payload.content, 'utf8');
    return { id, ok: true, result: { ok: true } };
  }

  if (action === 'listAssets') {
    const dir = path.join(PUBLIC_DIR, 'assets');
    if (!fs.existsSync(dir)) return { id, ok: true, result: { assets: [] } };
    const assets = fs.readdirSync(dir)
      .filter(f => /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(f))
      .map(f => ({ name: f, path: `/assets/${f}`, size: fs.statSync(path.join(dir, f)).size }));
    return { id, ok: true, result: { assets } };
  }

  if (action === 'uploadAsset') {
    const dir = path.join(PUBLIC_DIR, 'assets');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, payload.filename), Buffer.from(payload.base64, 'base64'));
    return { id, ok: true, result: { path: `/assets/${payload.filename}` } };
  }

  if (action === 'uploadFavicon') {
    fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.png'), Buffer.from(payload.base64, 'base64'));
    return { id, ok: true, result: { path: '/favicon.png' } };
  }

  if (action === 'readSiteConfig') {
    const p = path.join(__dirname, 'admin-config.json');
    return { id, ok: true, result: { config: fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {} } };
  }

  if (action === 'writeSiteConfig') {
    fs.writeFileSync(path.join(__dirname, 'admin-config.json'), JSON.stringify(payload.config, null, 2));
    return { id, ok: true, result: { ok: true } };
  }

  return { id, ok: false, error: `Unknown action: ${action}` };
}

// ─── Сервер ───────────────────────────────────────────────────────────────────

const server = http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
  res.end('etiquette-book Admin Bridge\n');
});

server.on('upgrade', (req, socket) => {
  if (req.headers['upgrade'] !== 'websocket') { socket.destroy(); return; }
  wsHandshake(req, socket);

  let buf = Buffer.alloc(0);
  socket.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length > 0) {
      const f = wsDecode(buf);
      if (!f) break;
      buf = buf.slice(f.consumed);
      if (f.opcode === 8) { socket.destroy(); return; }
      if (f.opcode === 9) { const p = Buffer.alloc(2); p[0] = 0x8a; p[1] = 0; socket.write(p); continue; }
      if (f.opcode !== 1 && f.opcode !== 2) continue;
      let msg;
      try { msg = JSON.parse(f.payload.toString('utf8')); } catch { continue; }
      let res;
      try   { res = handle(msg); }
      catch (e) { res = { id: msg.id, ok: false, error: e.message }; }
      socket.write(wsEncode(JSON.stringify(res)));
    }
  });
  socket.on('error', () => {});
});

server.listen(7777, '127.0.0.1', () => {
  console.log('\n✅  Admin Bridge: ws://127.0.0.1:7777');
  console.log('    Ctrl+Shift+A в браузере — открыть панель\n');
});