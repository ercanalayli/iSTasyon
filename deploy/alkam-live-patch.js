(() => {
  'use strict';

  const money = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n || 0));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmtDate = (v) => String(v || '—');

  function patchStaticCounters(active) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const p = node.parentElement;
      if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/i.test(p.tagName)) continue;
      const raw = node.nodeValue || '';
      let next = raw
        .replace(/73\s*cari\s*yüklü/gi, active + ' cari yüklü')
        .replace(/73\s*\/\s*73/g, active + ' / ' + active);
      if (next !== raw) node.nodeValue = next;
    }

    const leaves = [...document.querySelectorAll('body *')].filter(el => el.children.length === 0 && el.textContent?.trim() === '73');
    for (const el of leaves) {
      const ctx = (el.parentElement?.textContent || '') + ' ' + (el.parentElement?.parentElement?.textContent || '');
      if (/AKTİF CARİ|CARİ SAYISI|aktif cari|cari sayısı/i.test(ctx)) el.textContent = String(active);
    }
  }

  function installStyles() {
    if (document.getElementById('ist-live-style')) return;
    const style = document.createElement('style');
    style.id = 'ist-live-style';
    style.textContent = `
      #ist-live-launch{position:fixed;right:18px;bottom:18px;z-index:2147483000;border:0;border-radius:999px;background:#0b63ce;color:#fff;font:800 13px/1 system-ui;padding:13px 17px;box-shadow:0 10px 34px #001a3b55;cursor:pointer}
      #ist-live-launch:hover{filter:brightness(1.05)}
      #ist-live-modal{position:fixed;inset:0;z-index:2147483001;background:#07111dcc;display:none;align-items:center;justify-content:center;padding:18px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
      #ist-live-modal.open{display:flex}
      .ist-live-shell{width:min(1500px,97vw);height:min(900px,94vh);background:#f5f8fc;border-radius:18px;overflow:hidden;box-shadow:0 30px 90px #0008;display:grid;grid-template-rows:auto 1fr;color:#122033}
      .ist-live-head{background:#0a2a52;color:white;padding:14px 18px;display:flex;align-items:center;gap:12px;justify-content:space-between}
      .ist-live-head h2{font-size:18px;margin:0}.ist-live-head small{opacity:.78}
      .ist-live-actions{display:flex;gap:8px;align-items:center}.ist-live-actions button{border:1px solid #ffffff35;background:#fff;color:#0a2a52;border-radius:10px;padding:8px 11px;font-weight:800;cursor:pointer}
      .ist-live-main{display:grid;grid-template-columns:380px 1fr;min-height:0}
      .ist-live-left{border-right:1px solid #dbe4ef;background:#fff;min-width:0;display:grid;grid-template-rows:auto 1fr}
      .ist-live-search{padding:12px;border-bottom:1px solid #e3e9f1}.ist-live-search input{width:100%;padding:11px 12px;border:1px solid #cdd8e6;border-radius:10px;font-size:14px}
      .ist-live-list{overflow:auto;padding:8px}.ist-live-item{width:100%;border:1px solid #dfe7f1;background:#fff;border-radius:12px;margin:0 0 7px;padding:10px 11px;text-align:left;cursor:pointer}
      .ist-live-item:hover,.ist-live-item.active{border-color:#2f7de1;background:#eef6ff}.ist-live-item strong{display:block;font-size:13px}.ist-live-item span{display:flex;justify-content:space-between;gap:10px;margin-top:5px;color:#61738a;font-size:12px}
      .ist-live-detail{overflow:auto;padding:18px}
      .ist-live-status{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:900}.ist-live-status.active{background:#e8f8ef;color:#137a45}.ist-live-status.passive{background:#eef1f5;color:#667085}
      .ist-live-kpis{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px;margin:14px 0}.ist-live-kpi{background:#fff;border:1px solid #dfe7f1;border-radius:13px;padding:12px}.ist-live-kpi small{display:block;color:#6d7d91;font-weight:700}.ist-live-kpi b{display:block;margin-top:5px;font-size:20px}
      .ist-live-note{background:#fff7e6;border:1px solid #efd79d;border-radius:12px;padding:11px 13px;margin:10px 0 14px;font-size:13px;line-height:1.45}
      .ist-live-tablewrap{overflow:auto;background:#fff;border:1px solid #dfe7f1;border-radius:13px}.ist-live-table{width:100%;border-collapse:collapse;font-size:12px}.ist-live-table th{position:sticky;top:0;background:#0f2f56;color:white;padding:9px;text-align:left}.ist-live-table td{padding:8px 9px;border-top:1px solid #e8edf3;vertical-align:top}.ist-live-table td.num{text-align:right;font-variant-numeric:tabular-nums}.ist-live-cancel{background:#f3f4f6;color:#747b86}
      .ist-live-banner{position:fixed;left:50%;transform:translateX(-50%);top:8px;z-index:2147482999;background:#0e7a45;color:#fff;border-radius:999px;padding:7px 12px;font:800 11px/1 system-ui;box-shadow:0 5px 20px #0003;pointer-events:none}
      #aperion-workspace-switch{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483600;display:flex;gap:4px;background:#fff;border:1px solid #d7e0eb;border-radius:16px;padding:4px;box-shadow:0 12px 40px #001a3b33;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
      #aperion-workspace-switch button{border:0;border-radius:12px;padding:10px 18px;background:transparent;color:#5b6878;font-weight:900;letter-spacing:.04em;cursor:pointer}
      #aperion-workspace-switch button.active[data-workspace="aperion"]{background:#0b1728;color:#fff}
      #aperion-workspace-switch button.active[data-workspace="istasyon"]{background:#0b63ce;color:#fff}
      #aperion-live-modal{position:fixed;inset:0;z-index:2147483500;background:#eef3f8;display:none;overflow:auto;padding:78px 18px 28px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#172235}
      #aperion-live-modal.open{display:block}
      .aperion-shell{width:min(1500px,96vw);margin:0 auto}
      .aperion-hero{background:#091522;color:white;border-radius:24px;padding:26px 28px;box-shadow:0 18px 48px #001a3b2b}
      .aperion-kicker{font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#72e1b2}.aperion-hero h1{margin:8px 0 6px;font-size:32px;line-height:1.1}.aperion-hero p{margin:0;color:#b9c6d6;max-width:900px;line-height:1.55}
      .aperion-kpis{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:12px;margin:16px 0}.aperion-kpi{background:#fff;border:1px solid #dce4ee;border-radius:16px;padding:16px}.aperion-kpi small{display:block;color:#7b8795;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.aperion-kpi b{display:block;font-size:28px;margin-top:5px}
      .aperion-tabs{display:flex;gap:6px;overflow:auto;background:#fff;border:1px solid #dce4ee;border-radius:16px;padding:6px}.aperion-tabs button{white-space:nowrap;border:0;border-radius:11px;background:transparent;padding:10px 13px;color:#637184;font-weight:800;cursor:pointer}.aperion-tabs button.active{background:#0b1728;color:#fff}
      .aperion-panel{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);gap:16px;margin-top:16px}.aperion-card{background:#fff;border:1px solid #dce4ee;border-radius:18px;padding:20px}.aperion-card h2,.aperion-card h3{margin:0}.aperion-card p{color:#69778a;line-height:1.5}.aperion-empty{margin-top:16px;border:1px dashed #c8d2df;border-radius:15px;background:#f7f9fc;padding:34px 18px;text-align:center}.aperion-empty strong{display:block;margin-bottom:7px}.aperion-alert{background:#fff7df;border-color:#ecd18d}.aperion-rule{background:#fff;border-radius:12px;padding:12px 13px;margin-top:10px;font-size:13px;line-height:1.45}
      @media(max-width:900px){#aperion-workspace-switch{top:8px}#aperion-workspace-switch button{padding:9px 12px;font-size:12px}#aperion-live-modal{padding:68px 10px 18px}.aperion-shell{width:100%}.aperion-hero{padding:21px 18px}.aperion-hero h1{font-size:25px}.aperion-kpis{grid-template-columns:1fr 1fr}.aperion-panel{grid-template-columns:1fr}}
      @media(max-width:900px){#ist-live-modal{padding:0}.ist-live-shell{width:100vw;height:100vh;border-radius:0}.ist-live-main{grid-template-columns:1fr}.ist-live-left{max-height:40vh;border-right:0;border-bottom:1px solid #dbe4ef}.ist-live-kpis{grid-template-columns:1fr 1fr}.ist-live-head small{display:none}}
      @media print{body>*:not(#ist-live-modal){display:none!important}#ist-live-modal{position:static;display:block!important;background:white;padding:0}.ist-live-shell{width:100%;height:auto;box-shadow:none}.ist-live-left,.ist-live-head .ist-live-actions{display:none}.ist-live-main{display:block}.ist-live-detail{overflow:visible}.ist-live-tablewrap{overflow:visible}.ist-live-table th{position:static}}
    `;
    document.head.appendChild(style);
  }

  function installWorkspaceShell() {
    if (document.getElementById('aperion-workspace-switch')) return;

    installStyles();

    const switcher = document.createElement('div');
    switcher.id = 'aperion-workspace-switch';
    switcher.innerHTML = '<button type="button" data-workspace="aperion">APEIRON</button><button type="button" data-workspace="istasyon">İSTASYON</button>';
    document.body.appendChild(switcher);

    const modal = document.createElement('div');
    modal.id = 'aperion-live-modal';
    modal.innerHTML = `
      <div class="aperion-shell">
        <section class="aperion-hero">
          <div class="aperion-kicker">ApeirON Control Center</div>
          <h1>Günün tamamı tek kontrol yüzeyinde.</h1>
          <p>Yapılacaklar, ödemeler, tahsilatlar, siparişler, belgeler ve onaylar aynı merkezde. Kritik finansal yazma işlemleri açık onay olmadan çalışmaz.</p>
        </section>
        <section class="aperion-kpis">
          <div class="aperion-kpi"><small>Bugün</small><b>—</b></div>
          <div class="aperion-kpi"><small>7 Gün</small><b>—</b></div>
          <div class="aperion-kpi"><small>Gecikmiş</small><b>—</b></div>
          <div class="aperion-kpi"><small>Onay</small><b>—</b></div>
        </section>
        <section class="aperion-tabs">
          <button class="active" type="button" data-aperion-tab="Bugün">Bugün</button>
          <button type="button" data-aperion-tab="Yapılacaklar">Yapılacaklar</button>
          <button type="button" data-aperion-tab="Ödemeler">Ödemeler</button>
          <button type="button" data-aperion-tab="Tahsilatlar">Tahsilatlar</button>
          <button type="button" data-aperion-tab="Verilecek Siparişler">Siparişler</button>
          <button type="button" data-aperion-tab="Alınan Siparişler">Alınan Siparişler</button>
          <button type="button" data-aperion-tab="Belge Eşleşmeleri">Belgeler</button>
          <button type="button" data-aperion-tab="Onay Kuyruğu">Onaylar</button>
        </section>
        <section class="aperion-panel">
          <div class="aperion-card">
            <h2 data-aperion-title>Bugün</h2>
            <p data-aperion-description>Günün kritik işleri, vadeleri ve bekleyen kararları.</p>
            <div class="aperion-empty">
              <strong>Canlı ApeirON veri bağlantısı sıradaki adım</strong>
              <span>Kaynak okunmadan sayı veya kayıt üretilmez. Bu alan Google Sheets / kontrol merkezi kaynaklarına bağlanacak.</span>
            </div>
          </div>
          <aside class="aperion-card aperion-alert">
            <h3>Veri güvenliği</h3>
            <div class="aperion-rule">Eksik veri sıfır kabul edilmez.</div>
            <div class="aperion-rule">Finansal kayıt, silme ve geri döndürülemez işlem açık onay gerektirir.</div>
            <div class="aperion-rule">ApeirON ile İstasyON aynı arayüzde çalışır; veri sorumlulukları ayrı tutulur.</div>
          </aside>
        </section>
      </div>`;
    document.body.appendChild(modal);

    const descriptions = {
      'Bugün':'Günün kritik işleri, vadeleri ve bekleyen kararları.',
      'Yapılacaklar':'Açık işler ve takip gerektiren görevler.',
      'Ödemeler':'Yaklaşan ve gecikmiş ödeme yükümlülükleri.',
      'Tahsilatlar':'Beklenen tahsilatlar ve takip edilmesi gereken cariler.',
      'Verilecek Siparişler':'Planlanan ve onay bekleyen satın alma siparişleri.',
      'Alınan Siparişler':'Müşterilerden gelen ve teslimat bekleyen siparişler.',
      'Belge Eşleşmeleri':'Evrak, işlem ve kayıt eşleştirmelerinin kontrol alanı.',
      'Onay Kuyruğu':'Açık onay gerektiren kritik işlemler.'
    };

    const setWorkspace = (workspace) => {
      const aperion = workspace === 'aperion';
      modal.classList.toggle('open', aperion);
      switcher.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.workspace === workspace));
      try { localStorage.setItem('aperion-workspace', workspace); } catch (_) {}
    };

    switcher.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => setWorkspace(btn.dataset.workspace)));

    modal.querySelectorAll('[data-aperion-tab]').forEach(btn => btn.addEventListener('click', () => {
      modal.querySelectorAll('[data-aperion-tab]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      const label = btn.dataset.aperionTab;
      modal.querySelector('[data-aperion-title]').textContent = label;
      modal.querySelector('[data-aperion-description]').textContent = descriptions[label] || '';
    }));

    let initial = 'aperion';
    try { initial = localStorage.getItem('aperion-workspace') || 'aperion'; } catch (_) {}
    setWorkspace(initial === 'istasyon' ? 'istasyon' : 'aperion');
  }

  function renderLiveApp(payload) {
    installStyles();
    const activeCount = Number(payload?.counts?.active || 0);
    patchStaticCounters(activeCount);

    const banner = document.createElement('div');
    banner.className = 'ist-live-banner';
    banner.textContent = 'CANLI KAYNAK · ' + activeCount + ' aktif cari';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 4500);

    const launch = document.createElement('button');
    launch.id = 'ist-live-launch';
    launch.type = 'button';
    launch.textContent = 'CANLI CARİLER · ' + activeCount;
    document.body.appendChild(launch);

    const modal = document.createElement('div');
    modal.id = 'ist-live-modal';
    modal.innerHTML = `
      <div class="ist-live-shell">
        <div class="ist-live-head">
          <div><h2>İstasyON · Canlı Cari Merkezi</h2><small>Google Sheets kaynak senkronu · salt okunur · ${esc(payload.generatedAt || '')}</small></div>
          <div class="ist-live-actions"><button type="button" data-print>Yazdır / PDF</button><button type="button" data-close>Kapat</button></div>
        </div>
        <div class="ist-live-main">
          <aside class="ist-live-left">
            <div class="ist-live-search"><input type="search" placeholder="Cari ara…"></div>
            <div class="ist-live-list"></div>
          </aside>
          <section class="ist-live-detail"></section>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const list = modal.querySelector('.ist-live-list');
    const detail = modal.querySelector('.ist-live-detail');
    const search = modal.querySelector('input[type="search"]');
    let selected = null;
    let visible = [];

    const drawDetail = (c) => {
      if (!c) { detail.innerHTML = '<p>Cari seçin.</p>'; return; }
      selected = c;
      [...list.querySelectorAll('.ist-live-item')].forEach(b => b.classList.toggle('active', b.dataset.name === c.name));
      const movements = [...(c.movements || [])].reverse();
      const note = c.note ? '<div class="ist-live-note"><b>Not:</b> '+esc(c.note)+'</div>' : '';
      detail.innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div><h2 style="margin:0 0 5px;font-size:23px">${esc(c.displayName || c.name)}</h2>
          <span class="ist-live-status ${c.status==='Aktif'?'active':'passive'}">${esc(c.status)}</span></div>
          <div style="text-align:right;color:#63748a;font-size:12px">Son hareket<br><b style="color:#172b45">${esc(c.lastMovement || '—')}</b></div>
        </div>
        <div class="ist-live-kpis">
          <div class="ist-live-kpi"><small>Güncel bakiye</small><b>${money(c.balance)}</b></div>
          <div class="ist-live-kpi"><small>Aylık ücret</small><b>${c.monthlyFee==null?'—':money(c.monthlyFee)}</b></div>
          <div class="ist-live-kpi"><small>Toplam borç</small><b>${money(c.totalDebit)}</b></div>
          <div class="ist-live-kpi"><small>Toplam alacak</small><b>${money(c.totalCredit)}</b></div>
        </div>
        ${note}
        <div style="margin:0 0 8px;color:#667085;font-size:12px">Son tahsilat: <b>${esc(c.lastPayment || '—')}</b> · X/İPTAL satırları denetim izi olarak gösterilir, toplamlara dahil edilmez.</div>
        <div class="ist-live-tablewrap">
          <table class="ist-live-table"><thead><tr><th>Tarih</th><th>Tip</th><th>Açıklama</th><th>Borç</th><th>Alacak</th><th>Bakiye</th></tr></thead><tbody>
          ${movements.map(m => `<tr class="${m.type==='X'?'ist-live-cancel':''}"><td>${esc(fmtDate(m.date))}</td><td>${esc(m.type)}</td><td>${esc(m.description)}</td><td class="num">${money(m.debit)}</td><td class="num">${money(m.credit)}</td><td class="num">${money(m.balance)}</td></tr>`).join('')}
          </tbody></table>
        </div>`;
    };

    const drawList = () => {
      const q = (search.value || '').trim().toLocaleLowerCase('tr-TR');
      visible = (payload.customers || []).filter(c => !q || (c.displayName || c.name).toLocaleLowerCase('tr-TR').includes(q));
      list.innerHTML = visible.map(c => `
        <button class="ist-live-item" type="button" data-name="${esc(c.name)}">
          <strong>${esc(c.displayName || c.name)}</strong>
          <span><i>${esc(c.status)}</i><b>${money(c.balance)}</b></span>
        </button>`).join('');
      list.querySelectorAll('.ist-live-item').forEach(btn => btn.addEventListener('click', () => {
        const c = payload.customers.find(x => x.name === btn.dataset.name);
        drawDetail(c);
      }));
      if (!selected || !visible.some(c => c.name === selected.name)) drawDetail(visible[0] || null);
    };

    search.addEventListener('input', drawList);
    modal.querySelector('[data-close]').addEventListener('click', () => modal.classList.remove('open'));
    modal.querySelector('[data-print]').addEventListener('click', () => window.print());
    launch.addEventListener('click', () => { modal.classList.add('open'); drawList(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('open'); });
    drawList();

    const observer = new MutationObserver(() => patchStaticCounters(activeCount));
    observer.observe(document.body, {subtree:true, childList:true, characterData:true});
  }

  async function boot() {
    installWorkspaceShell();
    try {
      const res = await fetch('/istasyon-live.json?_=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const payload = await res.json();
      renderLiveApp(payload);
    } catch (err) {
      console.error('İstasyON canlı veri katmanı yüklenemedi:', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();