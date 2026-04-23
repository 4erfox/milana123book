/**
 * admin/panels/AssetsPanel.js — загрузка изображений и favicon
 */

import { bridge } from '../bridge.js';
import { toast } from '../toast.js';
import { getT } from '../theme.js';

function formatBytes(bytes) {
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function createDropZone(t, label, hint, accept, multiple, onFiles) {
  const wrap = document.createElement('div');
  let dragOver = false;

  function render() {
    wrap.innerHTML = `
      <div class="adm-dropzone" style="border:1.5px dashed ${dragOver ? t.borderStrong : t.border};border-radius:10px;padding:28px 20px;text-align:center;cursor:pointer;background:${dragOver ? t.surfaceHov : t.surface};transition:all 0.15s">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${dragOver ? t.fg : t.fgMuted}" stroke-width="2" style="margin:0 auto 10px;display:block"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div style="font-size:13px;color:${dragOver ? t.fg : t.fgMuted};font-weight:500;font-family:${t.mono}">${label}</div>
        <div style="font-size:11px;color:${t.fgSub};margin-top:4px">Перетащи или кликни</div>
      </div>
      ${hint ? `<div style="font-size:10px;color:${t.fgSub};margin-top:6px;padding-left:2px">${hint}</div>` : ''}
      <input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} style="display:none">
    `;

    const zone = wrap.querySelector('.adm-dropzone');
    const input = wrap.querySelector('input');

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); dragOver = true; render(); });
    zone.addEventListener('dragleave', () => { dragOver = false; render(); });
    zone.addEventListener('drop', e => {
      e.preventDefault(); dragOver = false; render();
      const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
      if (files.length) onFiles(files);
    });
    input.addEventListener('change', () => {
      const files = [...input.files];
      if (files.length) onFiles(files);
      input.value = '';
    });
  }

  render();
  return wrap;
}

export function renderAssetsPanel(container) {
  const t = getT();
  let uploadedAssets = [];

  container.innerHTML = `
    <div style="flex:1;overflow-y:auto;padding:12px;background:${t.bg}" class="adm-scroll">

      <div style="display:flex;align-items:center;gap:6px;font-size:9px;font-weight:700;color:${t.fgSub};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        FAVICON / ЛОГОТИП
      </div>

      <div id="adm-favicon-zone"></div>

      <div style="height:1px;background:${t.border};margin:16px 0"></div>

      <div style="display:flex;align-items:center;gap:6px;font-size:9px;font-weight:700;color:${t.fgSub};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        ИЗОБРАЖЕНИЯ (public/assets/)
      </div>

      <div id="adm-assets-zone"></div>
      <div id="adm-assets-list" style="margin-top:14px"></div>

      <div id="adm-assets-error"></div>
    </div>
  `;

  // Favicon zone
  const faviconZone = container.querySelector('#adm-favicon-zone');
  faviconZone.appendChild(createDropZone(
    t, 'Загрузить favicon', 'PNG, SVG, ICO · Сохраняется как public/favicon.png',
    'image/png,image/svg+xml,image/x-icon,image/webp', false,
    async files => {
      try {
        const b64 = await fileToBase64(files[0]);
        await bridge.uploadFavicon(b64, files[0].type);
        toast.success('Favicon обновлён');
      } catch(e) { toast.error(e.message); }
    }
  ));

  // Assets zone
  const assetsZone = container.querySelector('#adm-assets-zone');
  assetsZone.appendChild(createDropZone(
    t, 'Загрузить изображения', 'Загруженные файлы доступны по пути /assets/filename',
    'image/*', true,
    async files => {
      const assetsList = container.querySelector('#adm-assets-list');
      for (const file of files) {
        try {
          const b64 = await fileToBase64(file);
          const res = await bridge.uploadAsset(file.name, b64, file.type);
          uploadedAssets.unshift({ filename: file.name, path: res.path, size: file.size });

          const item = document.createElement('div');
          item.style.cssText = `display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:7px;border:1px solid ${t.border};margin-bottom:6px;background:${t.surface}`;
          item.innerHTML = `
            <img src="${res.path}" alt="" style="width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0">
            <div style="flex:1;min-width:0">
              <div style="font-size:11px;color:${t.fg};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:${t.mono}">${file.name}</div>
              <div style="font-size:10px;color:${t.fgSub};font-family:${t.mono}">${res.path} · ${formatBytes(file.size)}</div>
            </div>
            <button class="adm-copy-path" data-path="${res.path}" style="display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:5px;border:1px solid ${t.border};background:transparent;color:${t.fgMuted};font-size:10px;cursor:pointer;font-family:${t.mono};white-space:nowrap">
              Скопировать путь
            </button>
          `;
          assetsList.prepend(item);

          toast.success(`Загружено: ${file.name}`);
        } catch(e) { toast.error(e.message); }
      }
    }
  ));

  // Делегирование для кнопок копирования
  container.querySelector('#adm-assets-list').addEventListener('click', e => {
    const btn = e.target.closest('.adm-copy-path');
    if (!btn) return;
    navigator.clipboard.writeText(btn.dataset.path);
    const orig = btn.textContent;
    btn.textContent = '✓ Скопировано';
    btn.style.color = t.success;
    setTimeout(() => { btn.textContent = orig; btn.style.color = t.fgMuted; }, 2000);
    toast.success('Путь скопирован');
  });
}
