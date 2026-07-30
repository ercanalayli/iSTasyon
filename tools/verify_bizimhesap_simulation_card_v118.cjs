if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('aperion-home-v3.html', 'utf8');

assert(html.includes('id="bizimhesapSimulationCard"'), 'SimÃ¼lasyon kartÄ± yok');
assert(html.includes('function renderBizimHesapSimulation(bank)'), 'SimÃ¼lasyon render fonksiyonu yok');
assert(html.includes("renderBizimHesapSimulation(bank);"), 'BirleÅŸik durum render Ã§aÄŸrÄ±sÄ± yok');
assert(html.includes('approval_center_simulation'), 'BirleÅŸik simÃ¼lasyon sÃ¶zleÅŸmesi okunmuyor');
assert(html.includes('fields.source_account'), 'Kaynak hesap gÃ¶sterilmiyor');
assert(html.includes('fields.target_account'), 'Hedef hesap gÃ¶sterilmiyor');
assert(html.includes('selected.blockers'), 'Blokajlar gÃ¶sterilmiyor');
assert(html.includes('sim.live_save_allowed===true'), 'CanlÄ± kayÄ±t gÃ¼venlik kontrolÃ¼ yok');
assert(html.includes('sim.writes_to_bizimhesap===true'), 'BizimHesap yazma gÃ¼venlik kontrolÃ¼ yok');
assert(html.includes('bank.safe_to_post===true'), 'BirleÅŸik gÃ¼venlik kilidi kontrolÃ¼ yok');
assert(html.includes('function esc(v)'), 'HTML kaÃ§Ä±ÅŸ korumasÄ± yok');
assert(!html.includes('fetch("/api/bizimhesap'), 'Kart canlÄ± BizimHesap API Ã§aÄŸrÄ±sÄ± yapmamalÄ±');

console.log('RESULT: OK - KullanÄ±cÄ±ya gÃ¶rÃ¼nen BizimHesap simÃ¼lasyon kartÄ± salt okunur ve gÃ¼venlik kilitli.');

