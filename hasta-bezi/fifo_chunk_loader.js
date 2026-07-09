(function(){
  var NO='0920260907';
  var MANIFEST='./fifo_chunks/manifest.json?v='+NO;
  function st(txt){var el=document.getElementById('fifoChunkStatus');if(el)el.textContent=txt}
  function ensureStatus(){
    var sec=document.getElementById('urun'); if(!sec)return;
    if(document.getElementById('fifoChunkStatusCard'))return;
    sec.insertAdjacentHTML('afterbegin','<div class="card" id="fifoChunkStatusCard"><div class="head"><h3>FIFO Büyük Veri Paketi</h3><div class="muted">ALIŞ RAPORU + SATIŞ RAPORU canlı veri paketi kontrolü.</div></div><div style="padding:12px"><div class="mini"><div class="box"><small>Durum</small><b id="fifoChunkStatus">Kontrol ediliyor...</b></div><div class="box"><small>Beklenen</small><b>1.882 ürün / 38.258 hareket / 34.869 satış</b></div><div class="box"><small>Kural</small><b>Bağlanmadan tamamlandı denmez</b></div></div></div></div>')
  }
  function loadScript(src){return new Promise(function(ok){var s=document.createElement('script');s.src=src+(src.indexOf('?')>=0?'&':'?')+'v='+NO;s.onload=function(){ok(true)};s.onerror=function(){ok(false)};document.head.appendChild(s)})}
  function finish(meta){
    var chunks=window.ALALYLI_FIFO_CHUNKS||[];
    var pack={meta:meta||{},summary:[],moves:{}};
    chunks.forEach(function(c){
      if(c.summary) pack.summary=pack.summary.concat(c.summary);
      if(c.moves) Object.keys(c.moves).forEach(function(k){pack.moves[k]=(pack.moves[k]||[]).concat(c.moves[k])});
    });
    window.ALALYLI_FIFO_PACK=pack;
    var moveCount=Object.values(pack.moves).reduce(function(a,b){return a+b.length},0);
    st('CANLI — '+pack.summary.length+' ürün / '+moveCount+' hareket');
    if(window.ALALYLI_FIFO_RENDER) window.ALALYLI_FIFO_RENDER();
    if(window.ALALYLI_MASTER_GUARD) window.ALALYLI_MASTER_GUARD();
  }
  function boot(){
    ensureStatus();
    fetch(MANIFEST,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('manifest yok');return r.json()}).then(function(m){
      if(!m.files||!m.files.length){st('BAĞLANMADI — manifest var ama chunk yok');return}
      st('Yükleniyor — '+m.files.length+' parça');
      window.ALALYLI_FIFO_CHUNKS=[];
      return m.files.reduce(function(p,f){return p.then(function(){return loadScript('./fifo_chunks/'+f)})},Promise.resolve()).then(function(){finish(m)})
    }).catch(function(){
      st('BAĞLANMADI — fifo_chunks/manifest.json yok. Büyük satış paketi henüz canlıya alınmadı.');
      if(window.ALALYLI_MASTER_GUARD) window.ALALYLI_MASTER_GUARD();
    })
  }
  [0,800,2500].forEach(function(t){setTimeout(boot,t)});
  window.ALALYLI_FIFO_CHUNK_BOOT=boot;
})();