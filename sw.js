const CACHE='aperion-mobile-v123';
const SHELL=['/aperion-merkez.html','/aperion-home-v3.html','/manifest.json','/aperion-mobile.css','/aperion-mobile.js','/aperion-icon-192-v2.png','/aperion-icon-512-v2.png','/data/aperion_surface_inventory.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/data/')&&url.pathname!=='/data/aperion_surface_inventory.json'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>new Response(
      JSON.stringify({ok:false,error:'LIVE_DATA_UNAVAILABLE',offline:true}),
      {status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}
    )));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
    }
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('/aperion-merkez.html'))));
});
