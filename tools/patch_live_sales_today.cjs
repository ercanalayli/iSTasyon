if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
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

// 1) SatÄ±ÅŸ AkÄ±ÅŸÄ± dÃ¶nem barÄ±na BugÃ¼n butonu ekle
replaceOnce(
  `<span class="fbar-l">DÃ¶nem</span>\n        <button class="fb" onclick="sM('yesterday',this,1)">DÃ¼n</button>`,
  `<span class="fbar-l">DÃ¶nem</span>\n        <button class="fb" onclick="sM('today',this,1)">BugÃ¼n</button>\n        <button class="fb" onclick="sM('yesterday',this,1)">DÃ¼n</button>`,
  'sales filter today button'
);

// 2) periodFor fonksiyonuna today desteÄŸi ekle
replaceOnce(
  `if(mode==='yesterday')return{label:'DÃ¼n',key:'dy',from:pr.yestS,to:pr.yestS,...ly(pr.yestS,pr.yestS)};`,
  `if(mode==='today')return{label:'BugÃ¼n',key:'tm',from:pr.todayS,to:pr.todayS,lyFrom:\`${'${pr.prevYear}'}${'${pr.todayS.substring(4)}'}\`,lyTo:\`${'${pr.prevYear}'}${'${pr.todayS.substring(4)}'}\`};\n  if(mode==='yesterday')return{label:'DÃ¼n',key:'dy',from:pr.yestS,to:pr.yestS,...ly(pr.yestS,pr.yestS)};`,
  'periodFor today support'
);

// 3) rU metriklerinde bugÃ¼n deÄŸiÅŸkeni oluÅŸtur
replaceOnce(
  `const top=met(base,pr.yearS,pr.todayS), last=met(base,pr.prevYearS,pr.prevYearE), month=met(base,pr.monthS,pr.todayS), prevMonth=met(base,pr.prevMonthS,pr.prevMonthE), week=met(base,pr.weekS,pr.todayS), yday=met(base,pr.yestS,pr.yestS);`,
  `const top=met(base,pr.yearS,pr.todayS), last=met(base,pr.prevYearS,pr.prevYearE), month=met(base,pr.monthS,pr.todayS), prevMonth=met(base,pr.prevMonthS,pr.prevMonthE), week=met(base,pr.weekS,pr.todayS), todayM=met(base,pr.todayS,pr.todayS), yday=met(base,pr.yestS,pr.yestS);`,
  'sales today metric variable'
);

// 4) SatÄ±ÅŸ KPI satÄ±rÄ±na BugÃ¼n kartÄ± ekle
replaceOnce(
  `<div class="sales-kpi-grid">\n        <div class="kpi g"><div class="kpi-l">DÃ¼n</div><div class="kpi-v">TL ${'${fmt(yday.ciro)}'}</div><div class="kpi-s">${'${fmt(yday.adet)}'} adet</div></div>`,
  `<div class="sales-kpi-grid">\n        <div class="kpi g"><div class="kpi-l">BugÃ¼n</div><div class="kpi-v">TL ${'${fmt(todayM.ciro)}'}</div><div class="kpi-s">${'${fmt(todayM.adet)}'} adet Â· ${'${fmt(todayM.rows)}'} iÅŸlem</div></div>\n        <div class="kpi g"><div class="kpi-l">DÃ¼n</div><div class="kpi-v">TL ${'${fmt(yday.ciro)}'}</div><div class="kpi-s">${'${fmt(yday.adet)}'} adet Â· ${'${fmt(yday.rows)}'} iÅŸlem</div></div>`,
  'sales today KPI card'
);

if (!changed) {
  console.log('No changes applied.');
  process.exit(0);
}

fs.writeFileSync(path, html, 'utf8');
console.log('Patch completed.');

