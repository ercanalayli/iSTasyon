import fs from 'node:fs';

const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const check=(name,pass)=>{console.log(`${pass?'OK  ':'FAIL'} ${name}`);if(!pass)process.exitCode=1};
const html=fs.readFileSync('aperion-merkez.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const manifest=readJson('manifest.json');
const bank=readJson('data/aperion_bank_approval_unified_status.json');
const payments=readJson('data/aperion_payment_obligation_registry.json');
const sales=readJson('data/sales_report_summary_2025_2026.json');
const sync=readJson('data/aperion_last_sync.json');

check('single PWA entry is unified center',manifest.id==='/aperion-merkez.html'&&manifest.start_url.startsWith('/aperion-merkez.html'));
check('safe-mode promise is visible',html.includes('Açık onay olmadan dış sisteme kayıt yok'));
check('live financial JSON is network-only',sw.includes("url.pathname.startsWith('/data/')")&&sw.includes("cache:'no-store'"));
check('offline live-data response is explicit 503',sw.includes('LIVE_DATA_UNAVAILABLE')&&sw.includes('status:503'));
check('failed responses are not cached',sw.includes('if(response.ok)'));
check('dashboard calculates source age',html.includes('ageDays')&&html.includes('gün önce'));
check('legacy inventory output is escaped',html.includes('const esc=')&&html.includes('safeLegacyUrl'));
check('bank schema has a valid timestamp',!Number.isNaN(Date.parse(bank.created_at)));
check('bank summary counts are non-negative numbers',['status_preview_count','status_candidate_count','status_review_count','status_ready_queue_count'].every(key=>Number.isFinite(bank.summary?.[key])&&bank.summary[key]>=0));
check('bank posting remains locked',bank.safe_mode===true&&bank.live_bizimhesap_save_called!==true&&bank.safe_to_post!==true);
check('payment registry has obligations',Array.isArray(payments.obligations)&&payments.obligations.length>0);
check('sales totals are numeric and dated',Number.isFinite(sales.grand_total?.Toplam)&&Number.isFinite(sales.grand_total?.Satır)&&typeof sales.report_summary?.at(-1)?.['Dönem']==='string');
check('sync evidence has jobs and a timestamp',Array.isArray(sync.jobs)&&sync.jobs.length>0&&!Number.isNaN(Date.parse(sync.finishedAt||sync.startedAt)));

if(process.exitCode)throw new Error('AperiON safety gate failed.');
console.log('AperiON v123 safety gate passed.');
