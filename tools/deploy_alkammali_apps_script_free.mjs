const SCRIPT_ID = '1cLRKKoLaJnIZc0ypC17b72_6Y_6s1TGqv7d3WGhC6T4WoWjlKS9H5z0Y';
const DEPLOYMENT_ID = 'AKfycbyHhULNUaSFkteRSVNNPCARtqh9PTMSyRYOaMsOp2SvnDnQ5OrthACFxrzdD_SNovJUKw';
const LIVE_URL = 'https://script.google.com/macros/s/' + DEPLOYMENT_ID + '/exec';

const expectedOld = `function doGet(e) {
  return ContentService.createTextOutput("Mali Merkez Aktif v9");
}`;

const replacement = String.raw`function doGet(e) {
  if (e && e.parameter && e.parameter.health === '1') {
    return ContentService.createTextOutput('Mali Merkez Aktif v9');
  }

  const CONTROL_ID = '155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc';
  const sh = SpreadsheetApp.openById(CONTROL_ID).getSheetByName('IS_TAKIP_GIRIS');
  if (!sh) throw new Error('IS_TAKIP_GIRIS bulunamadı');

  const lastRow = sh.getLastRow();
  const rows = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, 20).getDisplayValues() : [];
  const items = rows
    .filter(function (r) { return r[0]; })
    .map(function (r) {
      return {
        id: r[0], category: r[1], title: r[2], due: r[3], amount: r[4], paid: r[5],
        stage: r[6], note: r[7], owner: r[8], source: r[9], created: r[10],
        sync: r[11], completed: r[18], updated: r[19]
      };
    })
    .filter(function (x) {
      return !x.completed && String(x.stage || '0') !== '1';
    });

  function count(k) {
    return items.filter(function (x) { return x.category === k; }).length;
  }

  const data = {
    updated: Utilities.formatDate(new Date(), 'Europe/Istanbul', 'dd.MM.yyyy HH:mm'),
    counts: { todo: count('todo'), collect: count('collect'), order: count('order') },
    items: items
  };

  const payload = JSON.stringify(data).replace(/</g, '\\u003c');
  const html = '<!doctype html><html lang="tr"><head><base target="_top">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<title>ApeirON | İstasyON</title><style>' +
    ':root{--bg:#06101d;--p:#0d1929;--p2:#111f32;--line:#233752;--text:#f4f8ff;--muted:#91a4bd}' +
    '*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#06101d,#091726);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
    '.app{max-width:1100px;margin:auto;padding:14px 14px 80px}.switch{position:sticky;top:8px;z-index:20;display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#071321ee;border:1px solid var(--line);padding:6px;border-radius:18px}' +
    '.switch button{border:0;border-radius:13px;padding:14px;font-size:15px;font-weight:900;background:transparent;color:var(--muted)}.switch button.on{background:linear-gradient(135deg,#1778e8,#57c9ff);color:#04111f}' +
    '.hero{margin-top:14px;padding:22px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(135deg,#10243b,#0a1727)}h1{margin:0;font-size:27px}.hero p{color:var(--muted);margin:7px 0 0}' +
    '.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}.kpi,.card{border:1px solid var(--line);background:var(--p);border-radius:17px;padding:15px}.kpi small{color:var(--muted)}.kpi b{display:block;font-size:27px;margin-top:5px}' +
    '.tabs{display:flex;gap:6px;overflow:auto;padding:6px;border:1px solid var(--line);background:var(--p);border-radius:16px}.tabs button{white-space:nowrap;border:0;border-radius:11px;padding:10px 13px;background:transparent;color:var(--muted);font-weight:800}.tabs button.on{background:var(--p2);color:#fff}' +
    '.list{display:grid;gap:9px;margin-top:12px}.item{border:1px solid var(--line);background:#091522;border-radius:15px;padding:13px}.item b{display:block;font-size:14px}.meta{display:flex;flex-wrap:wrap;gap:7px;margin-top:7px;color:var(--muted);font-size:11px}.pill{padding:4px 7px;border-radius:999px;background:#16304d;color:#9ed0ff}.note{margin-top:7px;color:#b7c6d8;font-size:12px;line-height:1.45}.empty{padding:28px;text-align:center;color:var(--muted)}#istasyon{display:none}.status{display:inline-block;margin-top:12px;padding:7px 10px;border-radius:999px;background:#123726;color:#73f1b1;font-size:11px;font-weight:900}' +
    '@media(max-width:700px){.kpis{grid-template-columns:1fr 1fr}.kpis .kpi:last-child{grid-column:1/-1}h1{font-size:23px}}' +
    '</style></head><body><div class="app">' +
    '<div class="switch"><button id="bA" class="on" onclick="mode(\'aperion\')">APEIRON</button><button id="bI" onclick="mode(\'istasyon\')">İSTASYON</button></div>' +
    '<section id="aperion"><div class="hero"><h1>ApeirON İş Takibi</h1><p>Normal GPT → kanonik Google Sheet → bu ekran.</p><span class="status" id="updated"></span></div>' +
    '<div class="kpis"><div class="kpi"><small>Yapılacaklar</small><b id="kt"></b></div><div class="kpi"><small>Tahsilatlar</small><b id="kc"></b></div><div class="kpi"><small>Siparişler</small><b id="ko"></b></div></div>' +
    '<div class="tabs" id="tabs"><button class="on" data-cat="todo">Yapılacaklar</button><button data-cat="collect">Tahsil edilecekler</button><button data-cat="order">Siparişler</button><button data-cat="payment">Ödenecekler</button><button data-cat="received">Alınan siparişler</button></div>' +
    '<div class="card" style="margin-top:12px"><div id="list" class="list"></div></div></section>' +
    '<section id="istasyon"><div class="hero"><h1>İstasyON · ALKAMMALI</h1><p>Mevcut WhatsApp/Telegram arka planı korunuyor.</p><span class="status">ARKA PLAN AKTİF · doPost KORUNDU</span></div><div class="card" style="margin-top:12px"><b>Güvenli alan</b><p style="color:var(--muted)">Bu panel yalnız okur; finansal yazma yapmaz.</p></div></section>' +
    '</div><script>' +
    'const DATA=' + payload + ';let CAT="todo";' +
    'function mode(m){document.getElementById("aperion").style.display=m==="aperion"?"block":"none";document.getElementById("istasyon").style.display=m==="istasyon"?"block":"none";document.getElementById("bA").classList.toggle("on",m==="aperion");document.getElementById("bI").classList.toggle("on",m==="istasyon")}' +
    'function esc(s){return String(s||"").replace(/[&<>"\\\']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;","\\\'":"&#39;"}[m]})}' +
    'function render(){const a=DATA.items.filter(function(x){return x.category===CAT}),el=document.getElementById("list");el.innerHTML=a.length?a.map(function(x){return "<div class=\\\"item\\\"><b>"+esc(x.title)+"</b><div class=\\\"meta\\\"><span class=\\\"pill\\\">"+esc(x.sync||"Bekliyor")+"</span><span>Vade: "+esc(x.due||"Tarih belirtilmedi")+"</span><span>"+esc(x.owner||x.source||"ApeirON")+"</span></div>"+(x.note?"<div class=\\\"note\\\">"+esc(x.note)+"</div>":"")+"</div>"}).join(""):"<div class=\\\"empty\\\">Bu bölümde açık kayıt yok.</div>"}' +
    'document.querySelectorAll("#tabs button").forEach(function(b){b.onclick=function(){document.querySelectorAll("#tabs button").forEach(function(x){x.classList.remove("on")});b.classList.add("on");CAT=b.dataset.cat;render()}});' +
    'document.getElementById("kt").textContent=DATA.counts.todo||0;document.getElementById("kc").textContent=DATA.counts.collect||0;document.getElementById("ko").textContent=DATA.counts.order||0;document.getElementById("updated").textContent="CANLI · "+DATA.updated;render();' +
    '<\\/script></body></html>';

  return HtmlService.createHtmlOutput(html).setTitle('ApeirON | İstasyON');
}`;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error('missing_secret:' + name);
  return v;
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const err = new Error('HTTP ' + res.status + ' ' + url);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
    refresh_token: requireEnv('GOOGLE_REFRESH_TOKEN'),
    grant_type: 'refresh_token'
  });
  const tok = await jsonFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'content-type':'application/x-www-form-urlencoded'},
    body
  });
  if (!tok.access_token) throw new Error('no_access_token');
  return tok.access_token;
}

function authHeaders(token) {
  return { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
}

async function getContent(token) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/content', {
    headers: authHeaders(token)
  });
}

async function putContent(token, content) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/content', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ files: content.files })
  });
}

async function createVersion(token, description) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/versions', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ description })
  });
}

async function updateDeployment(token, versionNumber, description) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/deployments/' + DEPLOYMENT_ID, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({
      deploymentConfig: {
        scriptId: SCRIPT_ID,
        versionNumber,
        manifestFileName: 'appsscript',
        description
      }
    })
  });
}

async function verifyLive() {
  const health = await fetch(LIVE_URL + '?health=1', { redirect: 'follow' });
  const healthText = await health.text();
  if (!health.ok || !healthText.includes('Mali Merkez Aktif v9')) {
    throw new Error('health_check_failed:' + health.status);
  }
  const page = await fetch(LIVE_URL, { redirect: 'follow' });
  const html = await page.text();
  const required = ['APEIRON','İSTASYON','Farmazon','Pazartesi faturalar kesilecek'];
  const missing = required.filter(x => !html.includes(x));
  if (!page.ok || missing.length) {
    throw new Error('live_panel_check_failed:' + page.status + ':missing=' + missing.join(','));
  }
  return true;
}

async function main() {
  const token = await getAccessToken();
  const original = await getContent(token);
  const files = original.files || [];
  const kod = files.find(f => f.name === 'Kod' && f.type === 'SERVER_JS') || files.find(f => f.name === 'Kod');
  if (!kod || typeof kod.source !== 'string') throw new Error('Kod.gs_not_found');
  if (!kod.source.includes(expectedOld)) throw new Error('expected_doGet_not_found_no_changes_made');

  const changed = JSON.parse(JSON.stringify(original));
  const changedKod = changed.files.find(f => f.name === kod.name && f.type === kod.type);
  changedKod.source = changedKod.source.replace(expectedOld, replacement);

  let headChanged = false;
  let deploymentChanged = false;
  try {
    await putContent(token, changed);
    headChanged = true;

    const version = await createVersion(token, 'ApeirON | İstasyON read-only panel 2026-10-04');
    if (!version || !version.versionNumber) throw new Error('version_create_failed');
    await updateDeployment(token, version.versionNumber, 'ApeirON | İstasyON read-only panel');
    deploymentChanged = true;

    await new Promise(r => setTimeout(r, 8000));
    await verifyLive();
    console.log('SUCCESS_APPS_SCRIPT_PANEL_DEPLOYED');
  } catch (err) {
    console.error('DEPLOY_FAILED', err.message);
    if (headChanged) {
      try {
        await putContent(token, original);
        console.log('HEAD_ROLLBACK_OK');
        if (deploymentChanged) {
          const rv = await createVersion(token, 'Rollback after failed ApeirON panel verification');
          await updateDeployment(token, rv.versionNumber, 'Rollback to previous ALKAMMALI source');
          console.log('LIVE_ROLLBACK_OK');
        }
      } catch (rollbackErr) {
        console.error('ROLLBACK_FAILED', rollbackErr.message);
      }
    }
    process.exitCode = 1;
  }
}

main().catch(err => {
  const detail = err && err.body && typeof err.body === 'object'
    ? { error: err.body.error || null, error_description: err.body.error_description || null }
    : null;
  console.error('PRECHECK_FAILED', err.message, detail ? JSON.stringify(detail) : '');
  process.exitCode = 1;
});
