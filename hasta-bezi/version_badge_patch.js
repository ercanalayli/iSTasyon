(function(){
  var VERSION='0920';
  function pickVersion(){return VERSION;}
  function apply(){
    var v=pickVersion();
    document.querySelectorAll('#stamp,.stamp').forEach(function(el){el.textContent='🆚 '+v});
    document.querySelectorAll('small,b,span,div').forEach(function(el){
      if(el.children&&el.children.length) return;
      var t=(el.textContent||'').trim();
      if(t==='Güncelleme No' || t==='Guncelleme No') el.textContent='🆚';
      if(/^Güncelleme No:\s*\d+/.test(t) || /^Guncelleme No:\s*\d+/.test(t) || /^🆚\s*\d+/.test(t)) el.textContent='🆚 '+v;
    });
  }
  [0,100,300,700,1500,3000,6000].forEach(function(t){setTimeout(apply,t)});
  try{new MutationObserver(function(){setTimeout(apply,20)}).observe(document.body,{childList:true,subtree:true,characterData:true})}catch(e){}
  window.ALALYLI_VERSION_BADGE=apply;
})();