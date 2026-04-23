// scripts/path.js
(function() {
    // Автоопределение base path для GitHub Pages
    const path = window.location.pathname;
    let base = '/';
    
    // Если URL содержит имя репозитория (github.io/репозиторий/)
    const match = path.match(/^\/([^/]+)\//);
    if (match && match[1] !== '' && !match[1].includes('localhost')) {
        if (!window.location.hostname.includes('localhost')) {
            base = '/' + match[1] + '/';
        }
    }
    
    window.APP_BASE = base;
    
    // Перехватываем fetch для автоматической подстановки base
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('/' + (match?.[1] || '')) && !url.startsWith('//')) {
            if (!url.startsWith(base)) {
                url = base + url.slice(1);
            }
        }
        return originalFetch(url, options);
    };
    
    // Для прямых ссылок
    window.resolvePath = function(relativePath) {
        if (relativePath.startsWith('http')) return relativePath;
        return base + relativePath.replace(/^\/+/, '');
    };
})();