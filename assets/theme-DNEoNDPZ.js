(function(){const o="site_theme",n=document.documentElement;function a(e){n.setAttribute("data-theme",e),localStorage.setItem(o,e);const r=document.getElementById("theme-toggle");if(!r)return;const t=r.querySelector(".theme-icon");e==="dark"?(t.innerHTML=l,r.setAttribute("title","Светлая тема")):(t.innerHTML=d,r.setAttribute("title","Тёмная тема"))}const d=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`,l=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`;function i(){const e=document.querySelector(".header-container");if(!e||document.getElementById("theme-toggle"))return;const r=document.createElement("button");r.id="theme-toggle",r.className="theme-toggle-btn",r.innerHTML='<span class="theme-icon"></span>',r.addEventListener("click",()=>{const b=n.getAttribute("data-theme")||"light";a(b==="dark"?"light":"dark")});const t=e.querySelector(".back-btn");t?e.insertBefore(r,t):e.appendChild(r)}function s(){if(document.getElementById("theme-styles"))return;const e=document.createElement("style");e.id="theme-styles",e.textContent=`
      /* ── Переход между темами ── */
      *, *::before, *::after {
        transition:
          background-color 0.3s ease,
          color 0.3s ease,
          border-color 0.3s ease;
      }

      /* ── Тёмная тема ── */
      [data-theme="dark"] {
        --bg-primary:    #0F0F0F;
        --bg-secondary:  #1A1A1A;
        --text-primary:  #F0EDE8;
        --text-secondary:#B8B4AE;
        --text-tertiary: #7A7672;
        --accent-color:  #E06040;
        --accent-hover:  #C84E2E;
        --border-color:  #2A2A2A;
        --sidebar-bg:    #161616;
      }

      [data-theme="dark"] body {
        background-color: var(--bg-primary);
        color: var(--text-primary);
      }

      [data-theme="dark"] .header {
        background: rgba(15, 15, 15, 0.98);
        border-bottom-color: var(--border-color);
      }

      [data-theme="dark"] .toc-sidebar {
        background: var(--sidebar-bg);
        border-color: var(--border-color);
      }

      [data-theme="dark"] .info-box {
        background: var(--sidebar-bg);
        border-color: var(--border-color);
      }

      [data-theme="dark"] .quote-block {
        border-left-color: var(--accent-color);
      }

      [data-theme="dark"] .content-figure {
        background: var(--bg-secondary);
        border-color: var(--border-color);
      }

      [data-theme="dark"] .back-btn {
        border-color: var(--border-color);
        color: var(--text-secondary);
      }

      [data-theme="dark"] .back-btn:hover {
        border-color: var(--accent-color);
        color: var(--accent-color);
        background: rgba(224, 96, 64, 0.08);
      }

      [data-theme="dark"] .page-nav-card {
        background: var(--bg-secondary);
        border-color: var(--border-color);
      }

      [data-theme="dark"] .page-nav-card:hover {
        border-color: var(--accent-color);
      }

      [data-theme="dark"] .section-text.dropcap::first-letter {
        color: var(--accent-color);
      }

      [data-theme="dark"] mark {
        background: rgba(224, 96, 64, 0.2);
        color: var(--accent-color);
      }

      /* ── Кнопка переключения темы ── */
      .theme-toggle-btn {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 1px solid var(--border-color, #E5E5E5);
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary, #4A4A4A);
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .theme-toggle-btn:hover {
        border-color: var(--accent-color, #C1502E);
        color: var(--accent-color, #C1502E);
        background: rgba(193, 80, 46, 0.06);
      }

      .theme-icon svg {
        width: 16px;
        height: 16px;
        display: block;
      }
    `,document.head.appendChild(e)}function c(){s(),i();const e=localStorage.getItem(o),r=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";a(e||r)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c(),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",e=>{localStorage.getItem(o)||a(e.matches?"dark":"light")})})();
