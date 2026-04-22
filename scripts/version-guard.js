(function () {
  const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
  const appBase = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
  const withBase = (relativePath) => `${appBase}${String(relativePath).replace(/^\/+/, '')}`;
  const currentUrl = new URL(window.location.href);

  // Avoid reload loops.
  const alreadyReloaded = currentUrl.searchParams.get('_v_reload') === '1';

  fetch(withBase('version.json'), { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((payload) => {
      if (!payload || !payload.buildTime) return;

      const versionKey = 'site_build_version';
      const previousVersion = localStorage.getItem(versionKey);
      const currentVersion = `${payload.version || '0.0.0'}:${payload.buildTime}`;

      if (previousVersion && previousVersion !== currentVersion && !alreadyReloaded) {
        localStorage.setItem(versionKey, currentVersion);
        currentUrl.searchParams.set('_v_reload', '1');
        window.location.replace(currentUrl.toString());
        return;
      }

      if (!previousVersion) {
        localStorage.setItem(versionKey, currentVersion);
      }
    })
    .catch(() => {
      // Ignore version checks on first deploy or temporary CDN lag.
    });
})();
