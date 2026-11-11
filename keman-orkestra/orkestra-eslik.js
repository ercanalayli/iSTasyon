/* Orkestra Eşlik modülü · Keman Stüdyosu V20.4.0 · claudeai2015261111 */
(function(){'use strict';
const css=`#orkOverlay{position:fixed;inset:0;z-index:2147483000;background:#f4c23f;display:none;flex-direction:column}
#orkOverlay.open{display:flex}
#orkOverlay .orkTop{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;padding-top:calc(8px + env(safe-area-inset-top));background:#14163a;color:#fff;font:700 15px system-ui,sans-serif}
#orkOverlay .orkTop button{background:#f4c23f;color:#14163a;border:0;border-radius:10px;padding:8px 14px;font:800 14px system-ui,sans-serif;cursor:pointer}
#orkOverlay iframe{flex:1;border:0;width:100%;background:#f4c23f}
.ks-tab.ork-tab{background:#f4c23f!important;color:#14163a!important;font-weight:800}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const ov=document.createElement('div');ov.id='orkOverlay';
ov.innerHTML='<div class="orkTop"><span>🎼 Orkestra Eşlik · Aşk Masalı</span><button type="button" id="orkClose">✕ Kapat</button></div>';
document.body.appendChild(ov);
let frame=null;
function open(){if(!frame){frame=document.createElement('iframe');frame.src='./orkestra.html';frame.allow='microphone; autoplay';frame.title='Orkestra Eşlik';ov.appendChild(frame)}ov.classList.add('open');document.documentElement.style.overflow='hidden';
 try{document.querySelectorAll('audio').forEach(a=>a.pause())}catch(e){}}
function close(){ov.classList.remove('open');document.documentElement.style.overflow='';if(frame){frame.remove();frame=null}}
ov.querySelector('#orkClose').onclick=close;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ov.classList.contains('open'))close()});
function addTab(){const ref=document.querySelector('[data-ks-tab="audit"]')||document.querySelector('[data-ks-tab]');if(!ref){return false}
 if(document.getElementById('orkTab'))return true;const b=document.createElement('button');b.type='button';b.id='orkTab';b.className='ks-tab ork-tab';b.innerHTML='<span>🎼</span> Orkestra';b.onclick=open;ref.after(b);return true}
if(!addTab()){let n=0;const iv=setInterval(()=>{if(addTab()||++n>40)clearInterval(iv)},250)}
if(location.hash==='#orkestra')open();
window.KS_Orkestra={open,close};
})();
