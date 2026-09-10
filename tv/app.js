const stage=document.querySelector('#stage');
const player=document.querySelector('#player');
const start=document.querySelector('#start');
const status=document.querySelector('#status');
const title=document.querySelector('#messageTitle');
const message=document.querySelector('#messageText');
let config=null,index=0,objectUrl=null,lastRevision='',currentItem=null,usingFallback=false;
let preferLite=localStorage.getItem('alayli-prefer-lite')==='1';

const showStatus=(value,linger=2500)=>{status.textContent=value;status.classList.add('show');clearTimeout(showStatus.timer);showStatus.timer=setTimeout(()=>status.classList.remove('show'),linger)};
const absolute=(value)=>new URL(value,location.href).href;

async function cachedBlob(url){
  const cache=await caches.open('alayli-media-v1');
  let response=await cache.match(url);
  if(!response){
    showStatus('YAYIN İNDİRİLİYOR',10000);
    response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error(`Medya alınamadı: ${response.status}`);
    await cache.put(url,response.clone());
  }
  return response.blob();
}

async function playItem(item,useFallback=false){
  useFallback=Boolean((useFallback||preferLite)&&item.fallbackSrc);
  currentItem=item;usingFallback=useFallback;
  if(objectUrl)URL.revokeObjectURL(objectUrl);
  const selected=useFallback&&item.fallbackSrc?item.fallbackSrc:item.src;
  let blob;
  try{blob=await cachedBlob(absolute(selected));}
  catch(error){
    if(!useFallback&&item.fallbackSrc){showStatus('HAFİF YAYINA GEÇİLİYOR',10000);return playItem(item,true);}
    throw error;
  }
  objectUrl=URL.createObjectURL(blob);
  player.src=objectUrl;
  player.muted=true;
  try{await player.play();start.style.display='none';stage.className='playing';showStatus(navigator.onLine?'YAYIN AKTİF':'ÇEVRİMDIŞI YAYIN');}
  catch{stage.className='';start.style.display='block';showStatus('BAŞLATMA ONAYI GEREKİYOR',10000);}
}

async function next(){
  const items=(config?.items||[]).filter(x=>x.active!==false);
  if(!items.length)throw new Error('Aktif yayın bulunamadı');
  index=(index+1)%items.length;
  await playItem(items[index]);
}

async function loadConfig(initial=false){
  try{
    const response=await fetch(`config.json?t=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error('Yayın listesi alınamadı');
    const incoming=await response.json();
    config=incoming;title.textContent=incoming.fallback?.title||'ALAYLI MEDİKAL';message.textContent=incoming.fallback?.text||'Satış danışmanımıza başvurun';
    if(initial||incoming.revision!==lastRevision){lastRevision=incoming.revision;index=0;await playItem((incoming.items||[]).filter(x=>x.active!==false)[0]);}
    setTimeout(()=>loadConfig(false),Math.max(60,incoming.refreshSeconds||300)*1000);
  }catch(error){
    console.error(error);showStatus('İNTERNET YOK · SON YAYIN',10000);
    if(initial&&!player.src){stage.className='error';title.textContent='ALAYLI MEDİKAL';message.textContent='Yayın bağlantısı bekleniyor';}
    setTimeout(()=>loadConfig(false),60000);
  }
}

player.addEventListener('ended',()=>next().catch(console.error));
player.addEventListener('error',()=>{
  if(currentItem?.fallbackSrc&&!usingFallback){preferLite=true;localStorage.setItem('alayli-prefer-lite','1');showStatus('UYUMLU YAYINA GEÇİLİYOR',10000);playItem(currentItem,true).catch(()=>stage.className='error');return;}
  next().catch(()=>stage.className='error');
});
start.addEventListener('click',async()=>{await player.play();start.style.display='none';stage.className='playing';document.documentElement.requestFullscreen?.().catch(()=>{});});
stage.addEventListener('click',async event=>{if(event.target===start)return;player.muted=true;await player.play().catch(()=>{});document.documentElement.requestFullscreen?.().catch(()=>{});});
document.addEventListener('keydown',event=>{if(event.key==='Enter'){start.click()}if(event.key.toLowerCase()==='f')document.documentElement.requestFullscreen?.().catch(()=>{});if(event.key.toLowerCase()==='r')location.reload();});
addEventListener('online',()=>showStatus('İNTERNET BAĞLANDI'));
addEventListener('offline',()=>showStatus('ÇEVRİMDIŞI YAYIN',10000));
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(console.error);
loadConfig(true);
