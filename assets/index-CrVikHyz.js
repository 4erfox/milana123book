import"./version-guard-D9Xirio9.js";const O=(()=>{const e=document.querySelector("base")?.getAttribute("href")||"/";return e.endsWith("/")?e:`${e}/`})();function x(e){return`${O}${String(e).replace(/^\/+/,"")}`}function F(){const e=localStorage.getItem("theme"),n=window.matchMedia("(prefers-color-scheme: dark)").matches,o=e||(n?"dark":"light");document.documentElement.setAttribute("data-theme",o)}F();document.addEventListener("DOMContentLoaded",()=>{const e=document.querySelector(".sidebar"),n=document.querySelector(".sidebar-overlay"),o=document.querySelectorAll(".nav-btn")[0],s=document.getElementById("close-sidebar"),l=document.getElementById("contacts-btn"),f=document.querySelector(".contacts-menu"),g=document.getElementById("contacts-close-btn"),y=document.getElementById("sidebar-search");function p(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function b(){const t=document.querySelector(".contacts-content");if(!t)return;const r=`
            <div class="contact-item">
                <label class="contact-label">Сайт</label>
                <a href="https://etiquettebook.com" target="_blank" class="contact-value">etiquettebook.com</a>
            </div>
            <div class="contact-item">
                <label class="contact-label">Email</label>
                <a href="mailto:etiquettebook2026@gmail.com" class="contact-value">etiquettebook2026@gmail.com</a>
            </div>
        `;try{const a=await fetch(x("api/contacts"));if(!a.ok)throw new Error("api error");const i=await a.json();let c=[];try{c=JSON.parse(i.content||"[]")}catch{c=[]}if(!c.length){t.innerHTML=r;return}t.innerHTML=c.map(h=>`
                <div class="contact-item">
                    <label class="contact-label">${p(h.title)}</label>
                    <a href="${p(h.href)}" class="contact-value" ${h.external?'target="_blank"':""}>
                        ${p(h.subtitle||h.href)}
                    </a>
                </div>
            `).join("")}catch{try{const a=await fetch(x("data/contacts.json")+"?t="+Date.now());if(!a.ok)throw new Error("file error");const i=await a.json();if(!i.length)throw new Error("empty");t.innerHTML=i.map(c=>`
                    <div class="contact-item">
                        <label class="contact-label">${p(c.title)}</label>
                        <a href="${p(c.href)}" class="contact-value" ${c.external?'target="_blank"':""}>
                            ${p(c.subtitle||c.href)}
                        </a>
                    </div>
                `).join("")}catch{t.innerHTML=r}}}async function $(){try{const t=localStorage.getItem("adm_jwt"),r=t?{Authorization:`Bearer ${t}`}:{},a=await fetch(x("api/config"),{headers:r});if(!a.ok)throw new Error(`HTTP ${a.status}`);const c=(await a.json()).config||{};localStorage.setItem("siteConfig",JSON.stringify(c)),u(c)}catch{const t=localStorage.getItem("siteConfig");if(t)try{u(JSON.parse(t))}catch{}}}function u(t){const r=document.querySelector(".hero h1");r&&t.siteTitle&&(r.textContent=t.siteTitle,document.title=t.siteTitle);const a=document.querySelector(".subtitle");a&&t.siteDescription&&(a.textContent=t.siteDescription)}async function d(){try{const t=await fetch(x("data/nav.json")+"?t="+Date.now());if(!t.ok)return;const r=await t.json(),a=document.querySelector(".sidebar-content");if(!a)return;a.innerHTML=r.map(i=>`
                <div class="menu-section" data-section="${i.id}">
                    <div class="menu-section-title">
                        <div class="menu-section-title-content">
                            <span class="menu-section-title-text">${i.title}</span>
                            <div class="menu-section-controls">
                                <span class="menu-section-counter">${i.pages.length}</span>
                                <div class="menu-section-arrow">
                                    <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="menu-items">
                        ${i.pages.map(c=>{const h=String(c.href||"").replace(/^\/+/,"");return`<a href="${x(h)}" class="menu-item" style="text-decoration:none;color:inherit;display:block">${c.title}</a>`}).join("")}
                    </div>
                </div>
            `).join(""),a.querySelectorAll(".menu-section-title").forEach(i=>{i.addEventListener("click",()=>{i.closest(".menu-section")?.classList.toggle("open")})})}catch(t){console.log("nav.json не найден:",t)}}b(),$(),d();function w(){e?.classList.add("open"),n?.classList.add("open"),document.body.style.overflow="hidden"}function v(){e?.classList.remove("open"),n?.classList.remove("open"),f?.classList.remove("open"),document.body.style.overflow=""}o?.addEventListener("click",w),s?.addEventListener("click",v),n?.addEventListener("click",v),l?.addEventListener("click",()=>f?.classList.add("open")),g?.addEventListener("click",()=>f?.classList.remove("open")),document.addEventListener("keydown",t=>{t.key==="Escape"&&v()}),y?.addEventListener("input",function(){const t=this.value.trim().toLowerCase();document.querySelectorAll(".menu-item").forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(t)?"block":"none"}),document.querySelectorAll(".menu-section").forEach(r=>{const a=Array.from(r.querySelectorAll(".menu-item")).some(i=>i.style.display==="block");r.style.display=a?"block":"none",t&&a&&r.classList.add("open")})}),document.querySelectorAll(".menu-section-title").forEach(t=>{t.addEventListener("click",()=>t.closest(".menu-section")?.classList.toggle("open"))}),window.addEventListener("load",()=>{const t=location.hash.slice(1);if(t){e?.classList.add("open"),n?.classList.add("open");const r=document.querySelector(`.menu-section[data-section="${t}"]`);r&&(r.classList.add("open"),r.scrollIntoView({behavior:"smooth",block:"center"}))}})});let B=[];const P=(()=>{const e=document.querySelector("base")?.getAttribute("href")||"/";return e.endsWith("/")?e:`${e}/`})(),L=e=>`${P}${String(e).replace(/^\/+/,"")}`;async function _(){try{const o=(await(await fetch(L("data/nav.json"))).json()).flatMap(s=>s.pages.map(l=>({title:l.title,href:L(String(l.href||"").replace(/^\/+/,"")),section:s.title,slug:l.href.replace(/^.*\/([^/]+)\.html$/,"$1"),text:""})));await Promise.allSettled(o.map(async s=>{try{const l=await fetch(L(`docs/${s.slug}.md`));if(!l.ok)return;const f=await l.text();s.text=f.replace(/^---[\s\S]*?---\n/m,"").replace(/#{1,6}\s+/g," ").replace(/[*_`~>]/g,"").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/\s+/g," ").trim()}catch{}})),B=o}catch{B=[]}}const M="search_history",C=5;function j(){try{return JSON.parse(localStorage.getItem(M))||[]}catch{return[]}}function J(e){let n=j().filter(o=>o.href!==e.href);n.unshift(e),n.length>C&&(n=n.slice(0,C)),localStorage.setItem(M,JSON.stringify(n))}function E(e){return e.toLowerCase().replace(/ё/g,"е")}function R(e){const n=E(e.trim());if(!n)return[];const o=n.split(/\s+/).filter(s=>s.length>1);return o.length?B.map(s=>{const l=E(s.title),f=E(s.section||""),g=E(s.text||""),y=o.filter(d=>l.includes(d)).length,p=o.filter(d=>f.includes(d)).length,b=o.filter(d=>g.includes(d)).length;if(!y&&!p&&!b)return null;const $=y*10+p*5+b;let u="";if(b&&!y){const d=o.find(i=>g.includes(i)),w=g.indexOf(d),v=Math.max(0,w-30),t=Math.min(g.length,w+d.length+70),r=(s.text||"").slice(v,t),a=new RegExp(d.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi");u=(v>0?"…":"")+r.replace(a,"<mark>$&</mark>")+(t<(s.text||"").length?"…":""),u=u.charAt(0).toUpperCase()+u.slice(1)}return{...s,score:$,snippet:u}}).filter(Boolean).sort((s,l)=>l.score-s.score).slice(0,8):[]}function K(){const e=document.createElement("div");return e.id="search-modal",e.innerHTML=`
    <div class="search-backdrop"></div>
    <div class="search-dialog" role="dialog" aria-modal="true" aria-label="Поиск">
      <div class="search-input-wrap">
        <svg class="srch-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="search-input" type="text" placeholder="Поиск по страницам и содержимому..." autocomplete="off" spellcheck="false"/>
        <kbd class="srch-esc">Esc</kbd>
      </div>
      <div id="search-results" class="srch-results"></div>
      <div class="srch-footer">
        <span><kbd>↑↓</kbd> навигация</span>
        <span><kbd>↵</kbd> открыть</span>
        <span><kbd>Esc</kbd> закрыть</span>
      </div>
    </div>
  `,document.body.appendChild(e),e.querySelector(".search-backdrop").addEventListener("click",A),e.querySelector("#search-results").addEventListener("click",n=>{const o=n.target.closest(".srch-item");o&&(n.preventDefault(),J({title:o.dataset.title,href:o.dataset.href,section:o.dataset.section}),A(),window.location.href=o.dataset.href)}),e}function U(e,n){if(!n||!e)return e;const o=new RegExp(`(${n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi");return e.replace(o,"<mark>$1</mark>")}function q(e,n,o){return e.length?`<div class="srch-label">${o}</div>`+e.map((s,l)=>`
      <a href="${s.href}" class="srch-item" data-idx="${l}" data-href="${s.href}" data-title="${s.title}" data-section="${s.section||""}">
        <span class="srch-item-body">
          <span class="srch-item-title">${U(s.title,n)}</span>
          ${s.section?`<span class="srch-item-section">${s.section}</span>`:""}
          ${s.snippet?`<span class="srch-snippet">${s.snippet}</span>`:""}
        </span>
        <svg class="srch-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </a>`).join(""):""}function D(e){const n=document.getElementById("search-results");if(!n)return;let o="";if(e.trim()){const s=R(e);o=s.length?q(s,e,`Результаты (${s.length})`):`<p class="srch-empty">Ничего не найдено по запросу «${e}»</p>`}else{const s=j();o=s.length?q(s,"","Недавно открытые"):'<p class="srch-empty">Начните вводить запрос — ищем по заголовкам и тексту страниц</p>'}n.innerHTML=o,m=-1}let m=-1;function I(){return Array.from(document.querySelectorAll("#search-results .srch-item"))}function T(e){const n=I();n.forEach(o=>o.classList.remove("active")),e>=0&&e<n.length?(n[e].classList.add("active"),n[e].scrollIntoView({block:"nearest"}),m=e):m=-1}let k=null,S=!1;function z(){k||(k=K()),k.classList.add("open"),S=!0,document.body.style.overflow="hidden";const e=document.getElementById("search-input");e&&(e.value="",e.focus()),D("")}function A(){k&&(k.classList.remove("open"),S=!1,document.body.style.overflow="")}document.addEventListener("keydown",e=>{if(e.key==="k"&&(e.metaKey||e.ctrlKey)||e.key==="/"&&!S&&document.activeElement.tagName!=="INPUT"){e.preventDefault(),z();return}if(S){if(e.key==="Escape"){A();return}if(e.key==="ArrowDown"&&(e.preventDefault(),T(Math.min(m+1,I().length-1))),e.key==="ArrowUp"&&(e.preventDefault(),T(Math.max(m-1,0))),e.key==="Enter"){e.preventDefault();const n=I(),o=m>=0?n[m]:n[0];o&&o.click()}}});document.addEventListener("input",e=>{e.target.id==="search-input"&&D(e.target.value)});function H(){const e=document.getElementById("search-btn");e&&e.addEventListener("click",n=>{n.stopPropagation(),z()})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",H):H();_();const N=document.createElement("style");N.textContent=`
#search-modal {
  display: none; position: fixed; inset: 0; z-index: 9999;
  align-items: flex-start; justify-content: center;
  padding-top: 80px; padding-left: 1rem; padding-right: 1rem;
}
#search-modal.open { display: flex; }

.search-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
}

.search-dialog {
  position: relative; width: 100%; max-width: 600px;
  background: #fff; border-radius: 12px; border: 1px solid #E5E5E5;
  overflow: hidden; max-height: calc(100vh - 120px);
  display: flex; flex-direction: column;
}

.search-input-wrap {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; border-bottom: 1px solid #E5E5E5; flex-shrink: 0;
}
.srch-icon { width: 18px; height: 18px; color: #6B6B6B; flex-shrink: 0; }

#search-input {
  flex: 1; border: none; outline: none;
  font-size: 15px; font-family: 'Inter', sans-serif;
  color: #1A1A1A; background: transparent; line-height: 1.5;
}
#search-input::placeholder { color: #6B6B6B; }

.srch-esc {
  font-size: 11px; color: #6B6B6B; background: #F5F5F4;
  border: 1px solid #E5E5E5; border-radius: 4px; padding: 2px 6px;
  font-family: 'Inter', sans-serif;
}

.srch-results { overflow-y: auto; padding: 8px 8px 4px; flex: 1; }

.srch-label {
  font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: #6B6B6B; padding: 4px 8px 6px;
}

.srch-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px;
  text-decoration: none; cursor: pointer;
  transition: background 0.15s;
}
.srch-item:hover, .srch-item.active { background: #FFF5F2; }

.srch-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }

.srch-item-title {
  font-size: 14px; font-weight: 500;
  font-family: 'Inter', sans-serif; color: #1A1A1A;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.srch-item-title mark {
  background: rgba(193,80,46,0.15); color: #C1502E;
  border-radius: 2px; padding: 0 1px;
}

.srch-item-section {
  font-size: 11px; font-family: 'Inter', sans-serif;
  color: #C1502E; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.srch-snippet {
  font-size: 12px; font-family: 'Inter', sans-serif; color: #6B6B6B;
  font-style: italic; line-height: 1.4;
  overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.srch-snippet mark {
  background: rgba(193,80,46,0.15); color: #C1502E;
  border-radius: 2px; padding: 0 1px; font-style: normal;
}

.srch-chevron { width: 14px; height: 14px; color: #C0C0C0; flex-shrink: 0; }

.srch-empty {
  font-family: 'Inter', sans-serif; font-size: 14px;
  color: #6B6B6B; text-align: center; padding: 2rem 1rem;
}

.srch-footer {
  display: flex; align-items: center; gap: 16px;
  padding: 8px 16px; border-top: 1px solid #E5E5E5; flex-shrink: 0;
}
.srch-footer span {
  font-size: 12px; font-family: 'Inter', sans-serif; color: #6B6B6B;
  display: flex; align-items: center; gap: 4px;
}
.srch-footer kbd {
  background: #F5F5F4; border: 1px solid #E5E5E5; border-radius: 4px;
  padding: 1px 5px; font-size: 11px; font-family: 'Inter', sans-serif;
}

@media (max-width: 600px) {
  #search-modal { padding-top: 20px; }
  .srch-footer { display: none; }
}
`;document.head.appendChild(N);
