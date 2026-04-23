/**
 * server.js — Express REST API + JWT аутентификация
 * Заменяет admin-server.js (WebSocket-бридж)
 *
 * Запуск:  node server.js
 * Зависимости: npm install express cors helmet express-rate-limit jsonwebtoken bcryptjs
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

// ─── Загрузка admin.env ───────────────────────────────────────────────────────

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx < 1) continue;
    const key = t.slice(0, idx).trim();
    const val = t.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(path.join(__dirname, 'admin.env'));

const JWT_SECRET  = process.env.JWT_SECRET;
const ADMIN_USER  = process.env.ADMIN_USERNAME      || 'admin';
const ADMIN_HASH  = process.env.ADMIN_PASSWORD_HASH;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN      || '8h';
const PORT        = process.env.PORT                || 7778;
const HOST        = process.env.HOST                || '127.0.0.1';

if (!JWT_SECRET || JWT_SECRET.includes('ЗАМЕНИ')) {
  console.error('\n❌  Задай JWT_SECRET в admin.env!\n');
  process.exit(1);
}
if (!ADMIN_HASH) {
  console.error('\n❌  Задай ADMIN_PASSWORD_HASH в admin.env!\n');
  process.exit(1);
}

// ─── Пути к файлам ────────────────────────────────────────────────────────────

const PUBLIC_DIR    = path.join(__dirname, 'public');
const PAGES_DIR     = path.join(PUBLIC_DIR, 'pages');
const DOCS_DIR      = path.join(PUBLIC_DIR, 'docs');
const ASSETS_DIR    = path.join(PUBLIC_DIR, 'assets');
const CONTACTS_PATH = path.join(PUBLIC_DIR, 'data', 'contacts.json');
const NAV_PATH      = path.join(PUBLIC_DIR, 'data', 'nav.json');
const SITE_CONFIG   = path.join(__dirname, 'admin-config.json');

// ─── Безопасность путей (защита от path traversal) ────────────────────────────

/**
 * Резолвит путь внутри baseDir. Выбрасывает 400, если путь выходит за пределы.
 */
function safeResolve(baseDir, ...parts) {
  const abs = path.resolve(baseDir, ...parts);
  if (!abs.startsWith(path.resolve(baseDir) + path.sep) &&
      abs !== path.resolve(baseDir)) {
    const err = new Error('Path traversal denied');
    err.status = 400;
    throw err;
  }
  return abs;
}

/**
 * Валидирует slug: только буквы, цифры, дефис и подчёркивание.
 * Возвращает false если slug опасный.
 */
function isValidSlug(slug) {
  return typeof slug === 'string' && /^[a-zA-Z0-9_-]+$/.test(slug) && slug.length <= 200;
}

// ─── JWT-утилиты ──────────────────────────────────────────────────────────────

function signToken(sub) {
  return jwt.sign({ sub, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

// ─── are: проверка JWT из заголовка Authorization ──────────────────────

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, error: 'AUTH_REQUIRED', message: 'Необходима авторизация' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ ok: false, error: 'TOKEN_INVALID', message: 'Токен недействителен или истёк' });
  }
  req.user = decoded;
  next();
}

// ─── Навигационные утилиты (перенесены из admin-server.js) ────────────────────

function htmlTitle(filename) {
  const fp = path.join(PAGES_DIR, filename);
  if (!fs.existsSync(fp)) return filename.replace('.html', '').replace(/-/g, ' ');
  const m = fs.readFileSync(fp, 'utf8').match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].split(/[—–]/)[0].trim() : filename.replace('.html','').replace(/-/g,' ');
}

function parseNavFromIndex() {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) return null;
  const html     = fs.readFileSync(indexPath, 'utf8');
  const sections = [];
  const blocks   = html.split(/<div\s+class="menu-section[^"]*"\s+data-section="([^"]+)"/);
  for (let i = 1; i < blocks.length; i += 2) {
    const titleM = blocks[i + 1]?.match(/class="menu-section-title-text"[^>]*>\s*([^<]+)\s*<\/span>/);
    if (!titleM) continue;
    const pages = [];
    let m;
    const re = /<a\s+href="([^"]+)"\s+class="[^"]*menu-item[^"]*"[^>]*>\s*([^<]+)\s*<\/a>/g;
    while ((m = re.exec(blocks[i + 1])) !== null)
      pages.push({ name: m[1].replace(/^.*\//, ''), href: m[1].trim(), title: m[2].trim() });
    sections.push({ id: blocks[i], title: titleM[1].trim(), pages });
  }
  return sections.length > 0 ? sections : null;
}

function getNav() {
  if (fs.existsSync(NAV_PATH)) {
    try {
      const s = JSON.parse(fs.readFileSync(NAV_PATH, 'utf8'));
      if (Array.isArray(s) && s.length) return s;
    } catch {}
  }
  const n = parseNavFromIndex();
  if (n) { persistNav(n); return n; }
  const files = fs.existsSync(PAGES_DIR)
    ? fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.html'))
    : [];
  const fb = [{ id: 'pages', title: 'Страницы', pages: files.map(f => ({ name: f, href: `/pages/${f}`, title: htmlTitle(f) })) }];
  persistNav(fb);
  return fb;
}

function persistNav(nav) {
  fs.mkdirSync(path.dirname(NAV_PATH), { recursive: true });
  fs.writeFileSync(NAV_PATH, JSON.stringify(nav, null, 2), 'utf8');
  updateIndexHtml(nav);
}

function updateIndexHtml(nav) {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, 'utf8');
  const sectionsHtml = nav.map(section => {
    const items = section.pages.map(p =>
      '                    <a href="' + p.href + '" class="menu-item" style="text-decoration:none;color:inherit;display:block">' + p.title + '</a>'
    ).join('\n');
    return [
      '            <div class="menu-section" data-section="' + section.id + '">',
      '                <div class="menu-section-title"><div class="menu-section-title-content">',
      '                    <span class="menu-section-title-text">' + section.title + '</span>',
      '                    <div class="menu-section-controls">',
      '                        <span class="menu-section-counter">' + section.pages.length + '</span>',
      '                        <div class="menu-section-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></div>',
      '                    </div></div></div>',
      '                <div class="menu-items">\n' + items + '\n                </div>',
      '            </div>',
    ].join('\n');
  }).join('\n\n');
  const s = html.indexOf('<div class="sidebar-content">');
  const e = html.lastIndexOf('</aside>');
  if (s === -1 || e === -1) return;
  html = html.slice(0, s) + '<div class="sidebar-content">\n' + sectionsHtml + '\n        </div>\n    ' + html.slice(e);
  fs.writeFileSync(indexPath, html, 'utf8');
}

function getAllPages() {
  if (!fs.existsSync(PAGES_DIR)) return [];
  return fs.readdirSync(PAGES_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => ({ name: f, href: `/pages/${f}`, title: htmlTitle(f), path: `public/pages/${f}` }));
}

// ─── Express приложение ───────────────────────────────────────────────────────

const app = express();

// Базовые security-заголовки
app.use(helmet());

// CORS — разрешаем только локально (при необходимости расширь origins)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Парсинг JSON-тела
app.use(express.json({ limit: '10mb' }));

// ─── Rate limiting ────────────────────────────────────────────────────────────

// Жёсткий лимит для эндпоинтов аутентификации (анти-брутфорс)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'TOO_MANY_REQUESTS', message: 'Слишком много попыток. Попробуй через 15 минут.' },
});

// Общий лимит для API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'TOO_MANY_REQUESTS', message: 'Слишком много запросов.' },
});

app.use('/api/auth', authLimiter);
app.use('/api',      apiLimiter);

// ─── Обработка ошибок ─────────────────────────────────────────────────────────

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ─── Роуты: /api/auth ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { username: string, password: string }
 * Response: { ok: true, token: string, expiresIn: string }
 */
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'MISSING_FIELDS', message: 'Укажите username и password' });
  }

  // Константное время сравнения имён (защита от timing attack)
  let userOk = false;
  try {
    userOk = crypto.timingSafeEqual(
      Buffer.from(username.padEnd(ADMIN_USER.length)),
      Buffer.from(ADMIN_USER.padEnd(username.length))
    ) && username.length === ADMIN_USER.length;
  } catch { /* разная длина → false */ }

  if (!userOk) {
    // Выполняем bcrypt в любом случае — не даём timing leak
    await bcrypt.compare('dummy', '$2b$10$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль' });
  }

  const passOk = await bcrypt.compare(password, ADMIN_HASH);
  if (!passOk) {
    return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль' });
  }

  const token = signToken(username);
  console.log(`  ✓ Вход: ${username} [${new Date().toISOString()}]`);
  res.json({ ok: true, token, expiresIn: JWT_EXPIRES });
}));

/**
 * POST /api/auth/verify
 * Body: { token: string }
 * Response: { ok: true, username: string }
 */
app.post('/api/auth/verify', asyncHandler(async (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ ok: false, error: 'MISSING_TOKEN', message: 'Токен не передан' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ ok: false, error: 'TOKEN_INVALID', message: 'Токен недействителен или истёк' });
  }
  res.json({ ok: true, username: decoded.sub });
}));

// ─── Роуты: /api/docs ─────────────────────────────────────────────────────────

/**
 * GET /api/docs
 * Список всех документов (slug + title из frontmatter).
 */
app.get('/api/docs', requireAuth, asyncHandler(async (req, res) => {
  if (!fs.existsSync(DOCS_DIR)) return res.json({ ok: true, docs: [] });

  const docs = fs.readdirSync(DOCS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const slug = f.replace('.md', '');
      const text = fs.readFileSync(path.join(DOCS_DIR, f), 'utf8');
      const title = text.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] || slug;
      const updatedAt = fs.statSync(path.join(DOCS_DIR, f)).mtime.toISOString();
      return { slug, title, updatedAt };
    });

  res.json({ ok: true, docs });
}));

/**
 * GET /api/docs/:slug
 * Получить содержимое документа.
 */
app.get('/api/docs/:slug', requireAuth, asyncHandler(async (req, res) => {
  const { slug } = req.params;

  if (!isValidSlug(slug)) {
    return res.status(400).json({ ok: false, error: 'INVALID_SLUG', message: 'Недопустимые символы в slug' });
  }

  const filePath = safeResolve(DOCS_DIR, slug + '.md');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: `Документ не найден: ${slug}` });
  }

  const content   = fs.readFileSync(filePath, 'utf8');
  const updatedAt = fs.statSync(filePath).mtime.toISOString();

  res.json({ ok: true, slug, content, updatedAt });
}));

/**
 * POST /api/docs/:slug
 * Создать или обновить документ.
 * Body: { content: string }
 */
app.post('/api/docs/:slug', requireAuth, asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { content } = req.body || {};

  if (!isValidSlug(slug)) {
    return res.status(400).json({ ok: false, error: 'INVALID_SLUG', message: 'Недопустимые символы в slug' });
  }
  if (typeof content !== 'string') {
    return res.status(400).json({ ok: false, error: 'MISSING_CONTENT', message: 'Поле content обязательно' });
  }

  const filePath = safeResolve(DOCS_DIR, slug + '.md');
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`  ✎ writeDoc: ${slug} [${req.user.sub}]`);
  res.json({ ok: true, slug, message: 'Документ сохранён' });
}));

/**
 * POST /api/docs
 * Создать новый документ с автогенерацией или явным slug.
 * Body: { slug?: string, content: string, title?: string }
 */
app.post('/api/docs', requireAuth, asyncHandler(async (req, res) => {
  let { slug, content, title } = req.body || {};

  // Если slug не передан — генерируем из title или по timestamp
  if (!slug) {
    slug = title
      ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
      : `doc-${Date.now()}`;
  }

  if (!isValidSlug(slug)) {
    return res.status(400).json({ ok: false, error: 'INVALID_SLUG', message: 'Недопустимые символы в slug' });
  }

  const filePath = safeResolve(DOCS_DIR, slug + '.md');

  if (fs.existsSync(filePath)) {
    return res.status(409).json({ ok: false, error: 'ALREADY_EXISTS', message: `Документ уже существует: ${slug}` });
  }

  // Если content не передан — создаём шаблон с frontmatter
  if (typeof content !== 'string') {
    content = `---\ntitle: ${title || slug}\n---\n\n# ${title || slug}\n`;
  }

  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`  ✚ createDoc: ${slug} [${req.user.sub}]`);
  res.status(201).json({ ok: true, slug, message: 'Документ создан' });
}));

/**
 * DELETE /api/docs/:slug
 * Удалить документ.
 */
app.delete('/api/docs/:slug', requireAuth, asyncHandler(async (req, res) => {
  const { slug } = req.params;

  if (!isValidSlug(slug)) {
    return res.status(400).json({ ok: false, error: 'INVALID_SLUG', message: 'Недопустимые символы в slug' });
  }

  const filePath = safeResolve(DOCS_DIR, slug + '.md');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: `Документ не найден: ${slug}` });
  }

  fs.unlinkSync(filePath);
  console.log(`  ✗ deleteDoc: ${slug} [${req.user.sub}]`);
  res.json({ ok: true, slug, message: 'Документ удалён' });
}));

// ─── Роуты: навигация ─────────────────────────────────────────────────────────

/** GET /api/nav — получить навигацию и список страниц */
app.get('/api/nav', requireAuth, asyncHandler(async (req, res) => {
  res.json({ ok: true, nav: getNav(), pages: getAllPages() });
}));

/** POST /api/nav — сохранить навигацию */
app.post('/api/nav', requireAuth, asyncHandler(async (req, res) => {
  const { nav } = req.body || {};
  if (!Array.isArray(nav)) {
    return res.status(400).json({ ok: false, error: 'INVALID_NAV', message: 'nav должен быть массивом' });
  }
  persistNav(nav);
  res.json({ ok: true, message: 'Навигация сохранена' });
}));

// ─── Роуты: файлы ─────────────────────────────────────────────────────────────

/** GET /api/files?path=relative/path */
app.get('/api/files', requireAuth, asyncHandler(async (req, res) => {
  const filePath = safeResolve(__dirname, req.query.path || '');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Файл не найден' });
  }
  res.json({ ok: true, content: fs.readFileSync(filePath, 'utf8') });
}));

/** POST /api/files — записать файл */
app.post('/api/files', requireAuth, asyncHandler(async (req, res) => {
  const { filePath, content } = req.body || {};
  if (!filePath || typeof content !== 'string') {
    return res.status(400).json({ ok: false, error: 'MISSING_FIELDS', message: 'filePath и content обязательны' });
  }
  const abs = safeResolve(__dirname, filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  res.json({ ok: true, message: 'Файл сохранён', path: filePath });
}));

/** DELETE /api/files — удалить файл */
app.delete('/api/files', requireAuth, asyncHandler(async (req, res) => {
  const { filePath } = req.body || {};
  if (!filePath) {
    return res.status(400).json({ ok: false, error: 'MISSING_FIELD', message: 'filePath обязателен' });
  }
  const abs = safeResolve(__dirname, filePath);
  if (!fs.existsSync(abs)) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Файл не найден' });
  }
  fs.statSync(abs).isDirectory()
    ? fs.rmSync(abs, { recursive: true })
    : fs.unlinkSync(abs);
  res.json({ ok: true, message: 'Файл удалён', path: filePath });
}));

// ─── Роуты: контакты ─────────────────────────────────────────────────────────

/** GET /api/contacts — публичный эндпоинт (без авторизации) */
app.get('/api/contacts', asyncHandler(async (req, res) => {
  const content = fs.existsSync(CONTACTS_PATH)
    ? fs.readFileSync(CONTACTS_PATH, 'utf8')
    : '[]';
  res.json({ ok: true, content });
}));

/** POST /api/contacts */
app.post('/api/contacts', requireAuth, asyncHandler(async (req, res) => {
  const { content } = req.body || {};
  if (typeof content !== 'string') {
    return res.status(400).json({ ok: false, error: 'MISSING_CONTENT', message: 'content обязателен' });
  }
  // Валидируем JSON
  try { JSON.parse(content); } catch {
    return res.status(400).json({ ok: false, error: 'INVALID_JSON', message: 'content должен быть валидным JSON' });
  }
  fs.mkdirSync(path.dirname(CONTACTS_PATH), { recursive: true });
  fs.writeFileSync(CONTACTS_PATH, content, 'utf8');
  res.json({ ok: true, message: 'Контакты сохранены' });
}));

// ─── Роуты: ассеты ────────────────────────────────────────────────────────────

/** GET /api/assets */
app.get('/api/assets', requireAuth, asyncHandler(async (req, res) => {
  if (!fs.existsSync(ASSETS_DIR)) return res.json({ ok: true, assets: [] });
  const assets = fs.readdirSync(ASSETS_DIR)
    .filter(f => /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(f))
    .map(f => ({
      name: f,
      path: `/assets/${f}`,
      size: fs.statSync(path.join(ASSETS_DIR, f)).size,
    }));
  res.json({ ok: true, assets });
}));

/** POST /api/assets — загрузить ассет (base64) */
app.post('/api/assets', requireAuth, asyncHandler(async (req, res) => {
  const { filename, base64, mimeType } = req.body || {};
  if (!filename || !base64) {
    return res.status(400).json({ ok: false, error: 'MISSING_FIELDS', message: 'filename и base64 обязательны' });
  }
  // Разрешаем только безопасные имена файлов
  if (!/^[a-zA-Z0-9_.-]+$/.test(filename) || filename.includes('..')) {
    return res.status(400).json({ ok: false, error: 'INVALID_FILENAME', message: 'Недопустимое имя файла' });
  }
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  fs.writeFileSync(path.join(ASSETS_DIR, filename), Buffer.from(base64, 'base64'));
  res.json({ ok: true, path: `/assets/${filename}` });
}));

/** POST /api/assets/favicon */
app.post('/api/assets/favicon', requireAuth, asyncHandler(async (req, res) => {
  const { base64 } = req.body || {};
  if (!base64) {
    return res.status(400).json({ ok: false, error: 'MISSING_BASE64', message: 'base64 обязателен' });
  }
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.png'), Buffer.from(base64, 'base64'));
  res.json({ ok: true, path: '/favicon.png' });
}));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'etiquette-book Admin API', time: new Date().toISOString() });
});

/** GET /api/config — публичный (для всех посетителей) */
app.get('/api/config', asyncHandler(async (req, res) => {
  const config = fs.existsSync(SITE_CONFIG)
    ? JSON.parse(fs.readFileSync(SITE_CONFIG, 'utf8'))
    : {};
  // Отдаём только нужные поля
  res.json({ ok: true, config: {
    siteTitle: config.siteTitle || '',
    siteDescription: config.siteDescription || ''
  } });
}));

/** POST /api/config — только для админа */
app.post('/api/config', requireAuth, asyncHandler(async (req, res) => {
  const { siteTitle, siteDescription } = req.body || {};

  if (typeof siteTitle !== 'string' || typeof siteDescription !== 'string') {
    return res.status(400).json({ ok: false, error: 'INVALID_CONFIG', message: 'siteTitle и siteDescription должны быть строками' });
  }

  const config = { siteTitle, siteDescription };
  fs.writeFileSync(SITE_CONFIG, JSON.stringify(config, null, 2), 'utf8');
  res.json({ ok: true, message: 'Настройки сохранены' });
}));

// ─── 404 для неизвестных /api/ роутов ────────────────────────────────────────

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'NOT_FOUND', message: `Эндпоинт не найден: ${req.method} ${req.path}` });
});

// ─── Глобальный обработчик ошибок ─────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status  = err.status || 500;
  const message = status < 500 ? err.message : 'Внутренняя ошибка сервера';
  if (status >= 500) console.error('Server error:', err);
  res.status(status).json({ ok: false, error: err.code || 'SERVER_ERROR', message });
});

// ─── Запуск ───────────────────────────────────────────────────────────────────

app.listen(PORT, HOST, () => {
  console.log(`\n✅  Admin API: http://${HOST}:${PORT}`);
  console.log(`    Пользователь: ${ADMIN_USER} · JWT: ${JWT_EXPIRES}`);
  console.log(`    Docs:    http://${HOST}:${PORT}/api/docs`);
  console.log(`    Health:  http://${HOST}:${PORT}/api/health\n`);
});

module.exports = app; // для тестов