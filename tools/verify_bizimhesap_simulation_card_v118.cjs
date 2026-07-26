const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('aperion-home-v3.html', 'utf8');

assert(html.includes('id="bizimhesapSimulationCard"'), 'Simülasyon kartı yok');
assert(html.includes('function renderBizimHesapSimulation(bank)'), 'Simülasyon render fonksiyonu yok');
assert(html.includes("renderBizimHesapSimulation(bank);"), 'Birleşik durum render çağrısı yok');
assert(html.includes('approval_center_simulation'), 'Birleşik simülasyon sözleşmesi okunmuyor');
assert(html.includes('fields.source_account'), 'Kaynak hesap gösterilmiyor');
assert(html.includes('fields.target_account'), 'Hedef hesap gösterilmiyor');
assert(html.includes('selected.blockers'), 'Blokajlar gösterilmiyor');
assert(html.includes('sim.live_save_allowed===true'), 'Canlı kayıt güvenlik kontrolü yok');
assert(html.includes('sim.writes_to_bizimhesap===true'), 'BizimHesap yazma güvenlik kontrolü yok');
assert(html.includes('bank.safe_to_post===true'), 'Birleşik güvenlik kilidi kontrolü yok');
assert(html.includes('function esc(v)'), 'HTML kaçış koruması yok');
assert(!html.includes('fetch("/api/bizimhesap'), 'Kart canlı BizimHesap API çağrısı yapmamalı');

console.log('RESULT: OK - Kullanıcıya görünen BizimHesap simülasyon kartı salt okunur ve güvenlik kilitli.');
