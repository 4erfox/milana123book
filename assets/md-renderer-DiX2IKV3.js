document.addEventListener("DOMContentLoaded",()=>{const o=document.querySelectorAll(".toc-link"),r=document.querySelectorAll(".content-section");o.length>0&&(o.forEach(t=>{t.addEventListener("click",s=>{s.preventDefault();const l=t.getAttribute("href").substring(1),p=document.getElementById(l);p&&p.scrollIntoView({behavior:"smooth"})})}),window.addEventListener("scroll",()=>{let t="";r.forEach(s=>{window.scrollY>=s.offsetTop-200&&(t=s.getAttribute("id"))}),o.forEach(s=>{s.classList.toggle("active",s.getAttribute("href")===`#${t}`)})}));const c={threshold:.1,rootMargin:"0px 0px -50px 0px"},e=new IntersectionObserver(t=>{t.forEach(s=>{s.isIntersecting&&(s.target.style.opacity="1",s.target.style.transform="translateY(0)",e.unobserve(s.target))})},c);document.querySelectorAll(".fade-in, .content-section, .section-divider").forEach(t=>{t.style.opacity="0",t.style.transform="translateY(20px)",t.style.transition="all 0.6s ease-out",e.observe(t)})});(async function(){const o=(()=>{const i=document.querySelector("base")?.getAttribute("href")||"/";return i.endsWith("/")?i:`${i}/`})(),r=i=>`${o}${String(i).replace(/^\/+/,"")}`;let e=new URLSearchParams(location.search).get("p")||window.__PAGE_SLUG__;if(!e){const i=location.pathname.match(/\/pages\/([^/]+)\.html$/);i&&(e=i[1])}if(!e){$("Страница не найдена. Укажите параметр ?p=название");return}let n;try{const i=await fetch(r(`docs/${e}.md`)+`?t=${Date.now()}`);if(!i.ok)throw new Error(`${i.status} ${i.statusText}`);n=await i.text()}catch(i){$(`Не удалось загрузить /docs/${e}.md — ${i.message}`);return}const t=b(n),s=t.body;if(document.title=`${t.title} — ${document._siteTitle||"Деловой этикет в Казахстане"}`,t.description){let i=document.querySelector('meta[name="description"]');i||(i=document.createElement("meta"),i.name="description",document.head.appendChild(i)),i.content=t.description}const l=document.getElementById("toc-list");if(l&&t.toc&&t.toc.length>0)l.innerHTML=t.toc.map((i,u)=>`<li><a href="#${i.id}" class="toc-link ${u===0?"active":""}">${i.label}</a></li>`).join("");else if(l){const i=E(s);l.innerHTML=i.map((u,v)=>`<li><a href="#${u.id}" class="toc-link ${v===0?"active":""}">${u.text}</a></li>`).join("")}const p=document.getElementById("main-content");if(!p)return;const h={intro:"Введение",basics:"Основы делового этикета",meetings:"Деловые встречи",culture:"Деловая культура Казахстана",online:"Онлайн-коммуникация",conflicts:"Конфликты и сложные ситуации"}[t.section]||t.section||"",f=t.section||"";let a=s;const m=t.toc&&t.toc.length>0?t.toc[0].id:null;m&&!s.trimStart().startsWith("## ")&&(a=`<!-- intro-section:${m} -->
`+s),p.innerHTML=`
    <div class="page-header">
      <div class="breadcrumb">
        <a href="${r("index.html")}">Главная</a>${h?` / <a href="${r(`index.html#${f}`)}">${h}</a>`:""} / ${t.title}
      </div>
      <h1 class="page-title">${t.title}</h1>
      <div class="page-meta">
        <span>Время чтения: ${t.read_time||"10 минут"}</span>
        <span>•</span>
        <span>${t.chapter||""}</span>
      </div>
    </div>
    <div id="md-content">${w(a,t.toc.map(i=>i.id))}</div>
  `,L(),I(e,t.section)})();function b(o){const r={title:"",description:"",section:"",read_time:"",chapter:"",toc:[],body:o};if(!o.startsWith("---"))return r;const c=o.indexOf(`
---`,3);if(c===-1)return r;const e=o.slice(3,c).trim();r.body=o.slice(c+4).trim();const n=e.split(`
`);let t=0;for(;t<n.length;){const s=n[t],l=s.indexOf(":");if(l<0){t++;continue}const p=s.slice(0,l).trim(),d=s.slice(l+1).trim().replace(/^["']|["']$/g,"");if(p==="toc"){for(t++;t<n.length&&n[t].match(/^\s+-?\s*(id:|label:)/);){const h=n[t].match(/id:\s*(.+)/),f=n[t+1]?.match(/label:\s*["']?(.+?)["']?$/);h&&f?(r.toc.push({id:h[1].trim(),label:f[1].trim()}),t+=2):t++}continue}p in r&&(r[p]=d),t++}return r}function w(o,r){const c=o.split(`
`),e=[];let n=0,t=0,s=!1,l=!1;function p(){s&&(e.push("</section>"),s=!1)}for(;n<c.length;){const d=c[n];if(d.startsWith("<!-- intro-section:")){p();const a=d.match(/<!-- intro-section:([^>]+) -->/)?.[1]||"introduction";e.push(`<section id="${a}" class="content-section">`),s=!0,l=!0,t++,n++;continue}if(d.startsWith("## ")){p();const a=d.slice(3).trim(),m=r&&r[t]?r[t]:x(a);t++,e.push(`<section id="${m}" class="content-section">`),e.push(`<h2 class="section-title">${g(a)}</h2>`),s=!0,l=!0,n++;continue}if(d.startsWith("### ")){e.push(`<h3 class="subsection-title">${g(d.slice(4).trim())}</h3>`),n++;continue}if(d.startsWith("#### ")){e.push(`<h4 class="subsection-title">${g(d.slice(5).trim())}</h4>`),n++;continue}if(d.startsWith("> ")){const a=[];for(;n<c.length&&c[n].startsWith("> ");)a.push(c[n].slice(2)),n++;e.push(y(a));continue}if(d.match(/^[-–—*] .+/)){const a=[];for(;n<c.length&&c[n].match(/^[-–—*] .+/);)a.push(c[n].slice(2).trim()),n++;e.push('<ul class="content-list">'),a.forEach(m=>e.push(`<li>${g(m)}</li>`)),e.push("</ul>");continue}if(d.match(/^\d+\. .+/)){const a=[];for(;n<c.length&&c[n].match(/^\d+\. .+/);)a.push(c[n].replace(/^\d+\. /,"").trim()),n++;e.push('<ol class="content-list">'),a.forEach(m=>e.push(`<li>${g(m)}</li>`)),e.push("</ol>");continue}if(d.match(/^!\[/)){const a=d.match(/^!\[([^\]]*)\]\(([^)]+)\)/);a&&e.push(`<figure class="content-figure"><img src="${a[2]}" alt="${a[1]}"><figcaption>${a[1]}</figcaption></figure>`),n++;continue}if(d.trim()==="---"){e.push("<hr>"),n++;continue}if(d.trim()===""){n++;continue}const h=[];for(;n<c.length&&c[n].trim()!==""&&!c[n].match(/^#{1,4} /)&&!c[n].startsWith("> ")&&!c[n].match(/^[-–—*] /)&&!c[n].match(/^\d+\. /);)h.push(c[n]),n++;const f=h.join(" ").trim();if(f){const a=l?"section-text dropcap":"section-text";l=!1,e.push(`<p class="${a}">${g(f)}</p>`)}}return p(),e.join(`
`)}function y(o){if((o[0]||"").startsWith("**")||o.some(e=>e.match(/^[-–—*] /))){const e=['<div class="info-box">'];let n=!1;const t=[];return o.forEach(s=>{if(s.startsWith("**")&&!n){const l=s.replace(/\*\*/g,"").trim().replace(/:$/,"");e.push(`<h3 class="info-box-title">${l}</h3>`),n=!0}else s.match(/^[-–—*] /)?t.push(s.slice(2).trim()):s.trim()&&e.push(`<p class="section-text">${g(s)}</p>`)}),t.length>0&&(e.push('<ul class="info-list">'),t.forEach(s=>e.push(`<li>${g(s)}</li>`)),e.push("</ul>")),e.push("</div>"),e.join(`
`)}else{const e=o.map(n=>n.replace(/^\*(.+)\*$/,"$1")).join(" ");return`<div class="quote-block"><p>${g(e)}</p></div>`}}function g(o){return o.replace(/\*\*\*(.+?)\*\*\*/g,"<strong><em>$1</em></strong>").replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>')}function x(o){return o.toLowerCase().replace(/\s+/g,"-").replace(/[^a-zа-яё0-9-]/gi,"").replace(/-+/g,"-")}function E(o){const r=[];return o.split(`
`).forEach(c=>{const e=c.match(/^## (.+)/);e&&r.push({id:x(e[1].trim()),text:e[1].trim()})}),r}function L(){requestAnimationFrame(()=>{const o=document.querySelectorAll(".toc-link"),r=document.querySelectorAll(".content-section");if(!o.length||!r.length)return;o.forEach(e=>{e.addEventListener("click",n=>{n.preventDefault();const t=e.getAttribute("href").slice(1),s=document.getElementById(t);s&&window.scrollTo({top:s.offsetTop-100,behavior:"smooth"})})});function c(){const e=window.scrollY;let n="";r.forEach(t=>{e>=t.offsetTop-150&&(n=t.id)}),o.forEach(t=>{const s=t.getAttribute("href")==="#"+n;t.classList.toggle("active",s)})}window.addEventListener("scroll",c,{passive:!0}),c()})}async function I(o,r){try{let a=function(i,u){const v=u==="prev";return`
        <a href="${n(String(i.href||"").replace(/^\/+/,""))}" class="page-nav-card page-nav-${u}">
          <span class="page-nav-label">
            ${v?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>':""}
            ${v?"Предыдущая":"Следующая"}
            ${v?"":'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'}
          </span>
          <span class="page-nav-title">${i.title}</span>
          <span class="page-nav-section">${i.section}</span>
        </a>`};var c=a;const e=(()=>{const i=document.querySelector("base")?.getAttribute("href")||"/";return i.endsWith("/")?i:`${i}/`})(),n=i=>`${e}${String(i).replace(/^\/+/,"")}`,l=(await(await fetch(n("data/nav.json"))).json()).flatMap(i=>i.pages.map(u=>({title:u.title,href:u.href,slug:u.href.replace(/^\/?pages\//,"").replace(/\.html$/,""),section:i.title}))),p=l.findIndex(i=>i.slug===o);if(p===-1)return;const d=p>0?l[p-1]:null,h=p<l.length-1?l[p+1]:null;if(!d&&!h)return;const f=document.getElementById("main-content");if(!f)return;const m=`
      <nav class="page-nav">
        <div class="page-nav-grid">
          ${d?a(d,"prev"):"<div></div>"}
          ${h?a(h,"next"):"<div></div>"}
        </div>
      </nav>`;if(f.insertAdjacentHTML("beforeend",m),!document.getElementById("page-nav-styles")){const i=document.createElement("style");i.id="page-nav-styles",i.textContent=`
        .page-nav {
          margin-top: 4rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border-color, #E5E5E5);
        }
        .page-nav-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .page-nav-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          border: 1px solid var(--border-color, #E5E5E5);
          background: var(--bg-secondary, #fff);
          text-decoration: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .page-nav-card:hover {
          border-color: #C1502E;
          box-shadow: 0 2px 8px rgba(193,80,46,0.08);
        }
        .page-nav-next {
          text-align: right;
        }
        .page-nav-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-family: 'Inter', sans-serif;
          color: var(--text-tertiary, #6B6B6B);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .page-nav-next .page-nav-label {
          justify-content: flex-end;
        }
        .page-nav-title {
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          color: #C1502E;
          line-height: 1.3;
        }
        .page-nav-section {
          font-size: 12px;
          font-family: 'Inter', sans-serif;
          color: var(--text-tertiary, #6B6B6B);
        }
        @media (max-width: 600px) {
          .page-nav-grid { grid-template-columns: 1fr; }
          .page-nav-next { text-align: left; }
          .page-nav-next .page-nav-label { justify-content: flex-start; }
        }
      `,document.head.appendChild(i)}}catch(e){console.warn("Page nav error:",e)}}function $(o){const r=document.getElementById("main-content"),c=(()=>{const e=document.querySelector("base")?.getAttribute("href")||"/";return e.endsWith("/")?e:`${e}/`})();r&&(r.innerHTML=`<div style="padding:3rem;color:#c0392b;font-family:sans-serif"><h2>Ошибка</h2><p>${o}</p><a href="${c}">← На главную</a></div>`),document.title="Ошибка — Деловой этикет"}(function(){const o=document.createElement("div");o.style.cssText="position:fixed;top:0;left:0;height:3px;width:0%;background:#C1502E;z-index:9999;transition:width 0.1s linear;pointer-events:none;",document.body.appendChild(o),window.addEventListener("scroll",()=>{const r=document.documentElement.scrollHeight-window.innerHeight;o.style.width=(r>0?window.scrollY/r*100:0)+"%"},{passive:!0})})();
