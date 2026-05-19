const fs = require('fs');
const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');
let changed = false;

function replaceOnce(from, to, label) {
  if (!html.includes(from)) {
    console.log('SKIP:', label);
    return;
  }
  html = html.replace(from, to);
  changed = true;
  console.log('OK:', label);
}

// 1) Satış Akışı dönem barına Bugün butonu ekle
replaceOnce(
  `<span class="fbar-l">Dönem</span>\n        <button class="fb" onclick="sM('yesterday',this,1)">Dün</button>`,
  `<span class="fbar-l">Dönem</span>\n        <button class="fb" onclick="sM('today',this,1)">Bugün</button>\n        <button class="fb" onclick="sM('yesterday',this,1)">Dün</button>`,
  'sales filter today button'
);

// 2) periodFor fonksiyonuna today desteği ekle
replaceOnce(
  `if(mode==='yesterday')return{label:'Dün',key:'dy',from:pr.yestS,to:pr.yestS,...ly(pr.yestS,pr.yestS)};`,
  `if(mode==='today')return{label:'Bugün',key:'tm',from:pr.todayS,to:pr.todayS,lyFrom:\`${'${pr.prevYear}'}${'${pr.todayS.substring(4)}'}\`,lyTo:\`${'${pr.prevYear}'}${'${pr.todayS.substring(4)}'}\`};\n  if(mode==='yesterday')return{label:'Dün',key:'dy',from:pr.yestS,to:pr.yestS,...ly(pr.yestS,pr.yestS)};`,
  'periodFor today support'
);

// 3) rU metriklerinde bugün değişkeni oluştur
replaceOnce(
  `const top=met(base,pr.yearS,pr.todayS), last=met(base,pr.prevYearS,pr.prevYearE), month=met(base,pr.monthS,pr.todayS), prevMonth=met(base,pr.prevMonthS,pr.prevMonthE), week=met(base,pr.weekS,pr.todayS), yday=met(base,pr.yestS,pr.yestS);`,
  `const top=met(base,pr.yearS,pr.todayS), last=met(base,pr.prevYearS,pr.prevYearE), month=met(base,pr.monthS,pr.todayS), prevMonth=met(base,pr.prevMonthS,pr.prevMonthE), week=met(base,pr.weekS,pr.todayS), todayM=met(base,pr.todayS,pr.todayS), yday=met(base,pr.yestS,pr.yestS);`,
  'sales today metric variable'
);

// 4) Satış KPI satırına Bugün kartı ekle
replaceOnce(
  `<div class="sales-kpi-grid">\n        <div class="kpi g"><div class="kpi-l">Dün</div><div class="kpi-v">TL ${'${fmt(yday.ciro)}'}</div><div class="kpi-s">${'${fmt(yday.adet)}'} adet</div></div>`,
  `<div class="sales-kpi-grid">\n        <div class="kpi g"><div class="kpi-l">Bugün</div><div class="kpi-v">TL ${'${fmt(todayM.ciro)}'}</div><div class="kpi-s">${'${fmt(todayM.adet)}'} adet · ${'${fmt(todayM.rows)}'} işlem</div></div>\n        <div class="kpi g"><div class="kpi-l">Dün</div><div class="kpi-v">TL ${'${fmt(yday.ciro)}'}</div><div class="kpi-s">${'${fmt(yday.adet)}'} adet · ${'${fmt(yday.rows)}'} işlem</div></div>`,
  'sales today KPI card'
);

if (!changed) {
  console.log('No changes applied.');
  process.exit(0);
}

fs.writeFileSync(path, html, 'utf8');
console.log('Patch completed.');
