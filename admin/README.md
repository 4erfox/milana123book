# Админ Панель — Инструкция по установке

## Структура файлов

Скопируй следующие файлы в свой проект:

```
твой-сайт/
├── public/
│   ├── pages/          ← твои HTML-страницы
│   └── data/           ← автосоздаётся при сохранении контактов
├── admin/              ← ВСЯ ПАПКА ЦЕЛИКОМ
│   ├── admin-panel.js  ← точка входа
│   ├── bridge.js       ← WebSocket клиент
│   ├── toast.js        ← уведомления
│   ├── theme.js        ← цветовые токены
│   └── panels/
│       ├── PagesPanel.js
│       ├── ContactsPanel.js
│       ├── AssetsPanel.js
│       └── SitePanel.js
└── admin-server.js     ← Node.js сервер (в КОРНЕ проекта)
```

## Шаг 1 — Скопируй файлы

- Папку `admin/` → в корень `public/` (чтобы было `public/admin/`)
- Файл `admin-server.js` → в корень проекта (рядом с папкой `public/`)

## Шаг 2 — Подключи скрипт в HTML

Добавь в конец `</body>` каждой страницы, где нужна панель:

```html
<script type="module" src="/admin/admin-panel.js"></script>
```

Или только в `index.html` для главной страницы.

## Шаг 3 — Запусти сервер

В терминале из корня проекта:

```bash
node admin-server.js
```

Сервер запустится на `ws://127.0.0.1:7777`

## Шаг 4 — Открой панель

Открой сайт в браузере и нажми **Ctrl+Shift+A**  
Или кликни кнопку **ADMIN** в левом нижнем углу.

---

## Вкладки панели

| Вкладка    | Что делает                                          |
|------------|-----------------------------------------------------|
| Страницы   | Просмотр HTML-страниц, редактирование meta/title    |
| Контакты   | Редактирование `public/data/contacts.json`          |
| Ассеты     | Загрузка изображений в `public/assets/`, favicon    |
| Сайт       | Настройки SEO, сохраняются в `admin-config.json`    |

---

## Использование contacts.json на сайте

После сохранения контактов через панель, файл `public/data/contacts.json`  
можно загрузить в любом скрипте:

```javascript
const res = await fetch('/data/contacts.json');
const contacts = await res.json();
```

Используй это для рендера контактов в `index.html`, например:

```javascript
// В public/scripts/index.js добавь:
async function loadContacts() {
  try {
    const res = await fetch('/data/contacts.json');
    const contacts = await res.json();
    // Обнови меню контактов
    const container = document.querySelector('.contacts-content');
    if (!container) return;
    container.innerHTML = contacts.map(c => `
      <div class="contact-item">
        <label class="contact-label">${c.title}</label>
        <a href="${c.href}" class="contact-value" ${c.external ? 'target="_blank"' : ''}>${c.subtitle || c.href}</a>
      </div>
    `).join('');
  } catch {}
}
loadContacts();
```

---

## Безопасность

⚠️ **Важно:** `admin-server.js` даёт доступ к файловой системе.  
Запускай его ТОЛЬКО локально при разработке, никогда не деплой на продакшн сервер.

Сервер слушает только `127.0.0.1` (localhost) — снаружи недоступен.

---

## Горячие клавиши

| Клавиша        | Действие              |
|----------------|-----------------------|
| Ctrl+Shift+A   | Открыть / закрыть     |
| Escape         | Закрыть               |
| Ctrl+S         | Сохранить (в Сайт)    |
