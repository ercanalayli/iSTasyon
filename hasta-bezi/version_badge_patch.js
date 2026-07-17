(function(){
  var VERSION='1540261707';
  function apply(){
    var text='🆚 '+VERSION;
    document.querySelectorAll('#stamp,.stamp').forEach(function(el){if(el.textContent!==text)el.textContent=text});
    document.querySelectorAll('small,b,span,div').forEach(function(el){
      if(el.children&&el.children.length) return;
      var t=(el.textContent||'').trim();
      if(t==='Güncelleme No' || t==='Guncelleme No'){ if(el.textContent!=='🆚') el.textContent='🆚'; }
      if(/^Güncelleme No:\s*\d+/.test(t) || /^Guncelleme No:\s*\d+/.test(t) || /^🆚\s*\d+/.test(t)){ if(el.textContent!==text) el.textContent=text; }
    });
  }
  [0,100,300,700,1500,3000,6000].forEach(function(t){setTimeout(apply,t)});
  window.ALALYLI_VERSION_BADGE=apply;
})();