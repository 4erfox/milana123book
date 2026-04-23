/**
 * admin/bridge.js — REST API + JWT клиент
 * Подключается к server.js на http://127.0.0.1:7778/api/
 */

const API_BASE = 'http://127.0.0.1:7778/api';
const TOKEN_KEY = 'admin_jwt_token';

let _token = null;
let _listeners = new Set();
let _status = 'disconnected';

function saveToken(token) {
    _token = token;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
}

function loadToken() {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) { _token = stored; return true; }
    return false;
}

function clearToken() { _token = null; localStorage.removeItem(TOKEN_KEY); }

async function request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    let data;
    try { data = await response.json(); } catch { throw new Error(`Ошибка: ${response.status}`); }

    if (!response.ok || !data.ok) {
        if (response.status === 401) { clearToken(); _status = 'disconnected'; broadcastStatus(); }
        throw new Error(data.message || data.error || `Ошибка ${response.status}`);
    }
    return data;
}

function broadcastStatus() { _listeners.forEach(fn => fn(_status)); }

export function onStatusChange(fn) { _listeners.add(fn); fn(_status); return () => _listeners.delete(fn); }
export function getStatus() { return _status; }

export const bridge = {
    // Аутентификация
    async login(username, password) {
        _status = 'connecting'; broadcastStatus();
        try {
            const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
            if (data.token) { saveToken(data.token); _status = 'connected'; broadcastStatus(); return { success: true, token: data.token }; }
            throw new Error('Нет токена');
        } catch (err) { clearToken(); _status = 'error'; broadcastStatus(); throw err; }
    },
    async logout() { clearToken(); _status = 'disconnected'; broadcastStatus(); },
    async verifyToken() { if (!_token) return false; try { await request('/auth/verify', { method: 'POST', body: JSON.stringify({ token: _token }) }); return true; } catch { clearToken(); return false; } },
    isAuthenticated() { return !!_token; },

    // Документы
    readDoc: slug => request(`/docs/${encodeURIComponent(slug)}`).then(data => ({ content: data.content })),
    writeDoc: (slug, content) => request(`/docs/${encodeURIComponent(slug)}`, { method: 'POST', body: JSON.stringify({ content }) }),
    listDocs: () => request('/docs').then(data => ({ docs: data.docs })),
    createDoc: (slug, content, title) => request('/docs', { method: 'POST', body: JSON.stringify({ slug, content, title }) }),
    deleteDoc: slug => request(`/docs/${encodeURIComponent(slug)}`, { method: 'DELETE' }),

    // Навигация
    listNav: () => request('/nav').then(data => ({ nav: data.nav, pages: data.pages })),
    saveNav: nav => request('/nav', { method: 'POST', body: JSON.stringify({ nav }) }),

    // Файлы
    readFile: filePath => request(`/files?path=${encodeURIComponent(filePath)}`).then(data => ({ content: data.content })),
    writeFile: (filePath, content) => request('/files', { method: 'POST', body: JSON.stringify({ filePath, content }) }),
    deleteFile: filePath => request('/files', { method: 'DELETE', body: JSON.stringify({ filePath }) }),

    // Ассеты
    listAssets: () => request('/assets').then(data => ({ assets: data.assets })),
    uploadAsset: (filename, base64, mimeType) => request('/assets', { method: 'POST', body: JSON.stringify({ filename, base64, mimeType }) }).then(data => ({ path: data.path })),
    uploadFavicon: base64 => request('/assets/favicon', { method: 'POST', body: JSON.stringify({ base64 }) }),

    // Контакты
    readContacts: () => request('/contacts').then(data => ({ content: data.content })),
    writeContacts: content => request('/contacts', { method: 'POST', body: JSON.stringify({ content }) }),

    // Настройки
    readSiteConfig: () => request('/config').then(data => ({ config: data.config })),
    writeSiteConfig: config => request('/config', { method: 'POST', body: JSON.stringify(config) }),
};

// Инициализация
if (loadToken()) { _status = 'connecting'; bridge.verifyToken().then(valid => { _status = valid ? 'connected' : 'disconnected'; broadcastStatus(); }).catch(() => { _status = 'disconnected'; broadcastStatus(); }); }
else { _status = 'disconnected'; }