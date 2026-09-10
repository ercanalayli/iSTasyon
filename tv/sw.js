const SHELL='alayli-shell-v2';
const FILES=['./','index.html','styles.css','app.js','config.json','manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key.startsWith('alayli-shell-')&&key!==SHELL).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(new URL(event.request.url).pathname.endsWith('/config.json')){event.respondWith(fetch(event.request).catch(()=>caches.match('config.json')));return;}
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{const copy=response.clone();caches.open(SHELL).then(cache=>cache.put(event.request,copy));return response;})));
});
