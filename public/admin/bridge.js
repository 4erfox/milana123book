/**
 * admin/bridge.js — WebSocket клиент-бридж
 * Подключается к admin-server.js на ws://127.0.0.1:7777
 */

const WS_URL = 'ws://127.0.0.1:7777';

let _ws = null;
let _pending = new Map();
let _listeners = new Set();
let _status = 'disconnected';
let _reconnectDelay = 1000;
let _reconnectTimer = null;
let _heartbeatTimer = null;
let _connectCalled = false;

function broadcast(s) {
  _status = s;
  _listeners.forEach(fn => fn(s));
}

function stopHeartbeat() {
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
}

function startHeartbeat() {
  stopHeartbeat();
  _heartbeatTimer = setInterval(() => {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ id: '__ping__', action: 'ping' }));
    }
  }, 15000);
}

function connect() {
  if (_ws?.readyState === WebSocket.OPEN || _ws?.readyState === WebSocket.CONNECTING) return;
  broadcast('connecting');
  try { _ws = new WebSocket(WS_URL); }
  catch { broadcast('error'); scheduleReconnect(); return; }

  _ws.onopen = () => {
    _reconnectDelay = 1000;
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    broadcast('connected');
    startHeartbeat();
  };
  _ws.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.id === '__ping__') return;
    const p = _pending.get(msg.id);
    if (!p) return;
    clearTimeout(p.timeout);
    _pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.result ?? null);
    else p.reject(new Error(msg.error ?? 'Bridge error'));
  };
  _ws.onclose = () => {
    stopHeartbeat();
    _pending.forEach(({ reject, timeout }) => { clearTimeout(timeout); reject(new Error('Disconnected')); });
    _pending.clear();
    broadcast('disconnected');
    scheduleReconnect();
  };
  _ws.onerror = () => broadcast('error');
}

function scheduleReconnect() {
  if (_reconnectTimer) return;
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    _reconnectDelay = Math.min(_reconnectDelay * 1.5, 10000);
    connect();
  }, _reconnectDelay);
}

function send(action, payload) {
  return new Promise((resolve, reject) => {
    if (_ws?.readyState !== WebSocket.OPEN) { reject(new Error('Not connected')); return; }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timeout = setTimeout(() => {
      _pending.delete(id);
      reject(new Error(`Timeout: ${action}`));
    }, 30000);
    _pending.set(id, { resolve, reject, timeout });
    _ws.send(JSON.stringify({ id, action, payload }));
  });
}

export function onStatusChange(fn) {
  _listeners.add(fn);
  if (!_connectCalled) { _connectCalled = true; connect(); }
  else fn(_status);
  return () => _listeners.delete(fn);
}

export function getStatus() { return _status; }

export const bridge = {
  // Markdown документы
  readDoc:         slug        => send('readDoc',        { slug }),
  writeDoc:        (slug, c)   => send('writeDoc',       { slug, content: c }),
  listDocs:        ()          => send('listDocs'),
  readFile:        fp            => send('readFile',       { filePath: fp }),
  writeFile:       (fp, c)       => send('writeFile',      { filePath: fp, content: c }),
  deleteFile:      fp            => send('deleteFile',     { filePath: fp }),
  // Навигация: разделы + страницы etiquette-book
  listNav:         ()            => send('listNav'),
  saveNav:         nav           => send('saveNav',        { nav }),
  // Ассеты
  listAssets:      ()            => send('listAssets'),
  uploadAsset:     (n, b64, m)   => send('uploadAsset',    { filename: n, base64: b64, mimeType: m }),
  uploadFavicon:   (b64, m)      => send('uploadFavicon',  { base64: b64, mimeType: m }),
  // Контакты
  readContacts:    ()            => send('readContacts'),
  writeContacts:   c             => send('writeContacts',  { content: c }),
  // Настройки сайта
  readSiteConfig:  ()            => send('readSiteConfig'),
  writeSiteConfig: cfg           => send('writeSiteConfig', { config: cfg }),
};
