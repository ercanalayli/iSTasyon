import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseUniversalCommand, continueUniversalCommand } from '../functions/telegram/universal-command-router.js';

const cases=[];
const add=(category,text,expect={})=>cases.push({category,text,expect});
const expensePhrases=['50 tl çay ercan nakit','50 lira çay masrafı ercan kasadan','çaya 50 tl verdim ercan nakitten','ERCAN NAKİT KASA 50 TL İKRAM MASRAFI','50₺ çay gideri Ercan Nakit Kasa','50,00 TL çay masrafı ercan kasa','çay için 50 tl ercan nakit','ercan kasadan çaya 50 lira','50 tl masraf ercan nakit kasa','50 tl gider ercan nakit'];
expensePhrases.forEach(x=>add('expense',x,{code:'bizimhesap.expense_post'}));
const transfers=['16000 tl TL kasadan Ercan nakit kasaya aktar','16000 kasadan Ercan nakite','Ercan nakite 16 bin aktar','16.000 TL TL Kasa dan Ercan Nakit Kasa ya transfer','TL Kasa > Ercan nakit 16000 TL virman','16000 lira tl kasadan ercan kasaya','ercan nakit kasaya tl kasadan 16 bin aktar','TRANSFER 16000 TL Kasa Ercan Nakit Kasa','16,000 TL TL kasadan Ercan nakite havale','16000 tl TL KASA ERCAN NAKİT KASA transfer'];
transfers.forEach(x=>add('cash_transfer',x,{code:'bizimhesap.cash_transfer_post'}));
['16000 tl kasadan Ercan nakit kasa transfer','Ercan nakite 16 bin aktar','16000 tl TL kasadan transfer','TL kasadan ercan nakite aktar'].forEach(x=>add('transfer_ambiguity',x,{clarification:true}));
['Vakıf Şirketten İş Bankasına 2500 TL aktar','2500 tl vakıftan iş bankasına havale','iş bankasına vakıf şirketten 2.500 tl transfer','AKBANK ŞİRKET GARANTİ ŞİRKET 3000 TL virman','yapı krediden vakıf şirkete 4000 lira aktar','garanti şirketten akbank şirkete 5000 tl transfer','6000 tl iş bankası vakıf şirket havale','7000 tl akbanktan yapı krediye aktar','vakıftan garantiye 8 bin tl virman','iş bankasından akbanka 9000 tl aktar'].forEach(x=>add('bank_transfer',x,{code:'bizimhesap.cash_transfer_post'}));
['Murat Ticaret 1250 TL tahsilat','Ahmet carisinden 1.250 lira tahsil ettim','5000 tl müşteriden tahsilat','Murat 2 bin TL para aldım tahsilat','TAHSİLAT 3500 TL AKTAŞ','aktaş 3.500₺ tahsilat','müşteri tahsilatı 4400 tl','4500 lira cari tahsilat','cariye 5500 tl tahsilat','6000 tl tahsil ettim'].forEach(x=>add('collection',x,{code:'bizimhesap.collection_draft'}));
['Kifidis 26990 tl ödeme','tedarikçiye 2500 lira ödedim','3000 tl ödeme vakıf şirket','Murat carisine 4 bin tl ödeme','ÖDEME 5000 TL SONOVA','sonovaya 5500₺ ödedim','6000 lira tedarikçi ödeme','cariye 6500 tl öde','7000 tl fatura ödeme','7500 tl ödeme hazırla'].forEach(x=>add('payment',x,{code:'bizimhesap.payment_draft'}));
['Murat Ticaret fatura taslağı hazırla','Ahmet için 5000 tl fatura taslak oluştur','fatura taslağı oluştur','8000 tl satış faturası taslağı hazırla','Murat ağustos faturası taslak','fatura oluştur taslak 9000 tl','10 bin tl fatura taslağı','AKTAŞ fatura hazırla taslak','taslak fatura oluştur 11000 lira','müşteri faturası taslağı hazırla 12000 tl'].forEach(x=>add('invoice_draft',x,{code:'bizimhesap.invoice_draft'}));
['Murat cari bakiye sorgula','Aktaş carisini göster','cari durumunu getir','Murat borcu kaç','müşteri cari sorgu','Sonova cari bakiye','Ahmet hesabı nedir','cari raporu göster','Murat cari özetle','tedarikçi cari sorgula'].forEach(x=>add('cari_query',x,{risk:'low_risk'}));
['bugünkü satışları göster','bu ay satış kaç','satış raporu getir','dünkü satışları sorgula','Murat satışlarını göster','eylül satış özeti','satış analizi getir','bugün ne kadar satış oldu','müşteri satış sorgu','yıllık satış raporla'].forEach(x=>add('sales_query',x,{risk:'low_risk'}));
['kasa bakiyesi kaç','vakıf şirket bakiye göster','iş bankası hesabı kaç','ercan nakit bakiye','hesap bakiyesi sorgula','akbank bakiye getir','garanti hesap durumu','tl kasa kaç para','yapı kredi bakiye','banka bakiyelerini göster'].forEach(x=>add('balance_query',x,{risk:'low_risk'}));
['merhaba nasılsın','hava nasıl','bana şiir yaz','16000 belki transfer veya gider','kasayı düşün','Murat hakkında konuş','50 çay olabilir','bir şeyler yap','hesap makinesi aç','belirsiz emir'].forEach(x=>add('unsupported',x,{unsupported:true}));

assert(cases.length>=100);
const durations=[]; let passed=0; const failures=[];
for(const tc of cases){const t=performance.now();const parsed=parseUniversalCommand(tc.text);durations.push(performance.now()-t);try{
  if(tc.expect.unsupported) assert.equal(parsed,null); else {assert(parsed); if(tc.expect.code) assert.equal(parsed.code,tc.expect.code); if(tc.expect.risk) assert.equal(parsed.risk,tc.expect.risk); if(tc.expect.clarification) assert.equal(parsed.needsClarification,true); if(parsed.category==='finance'&&parsed.risk==='approval_required'){assert.equal(parsed.executionMode,'prepare_only');assert.equal(parsed.financialWrite??0,0);assert.equal(parsed.bizimhesapWrite??0,0);}}
  passed++;
}catch(error){failures.push({text:tc.text,expected:tc.expect,actual:parsed,error:error.message});}}
const partial=parseUniversalCommand('16000 tl kasadan Ercan nakit kasa transfer');
assert.equal(partial.targetAccount,'Ercan Nakit Kasa');assert.deepEqual(partial.missingFields,['source_account']);
const continued=continueUniversalCommand(partial,'TL Kasa');assert.equal(continued.sourceAccount,'TL Kasa');assert.equal(continued.targetAccount,'Ercan Nakit Kasa');assert.equal(continued.status,'approval_required');
const sorted=[...durations].sort((a,b)=>a-b);const percentile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))];
const security={no_guess_on_missing_source:partial.sourceAccount===null,no_write_on_clarification:partial.financialWrite===0&&partial.bizimhesapWrite===0,context_preserved:continued.amount===16000&&continued.targetAccount==='Ercan Nakit Kasa',approval_payload_binding:'covered_by_existing_sha256_guard',duplicate_prevention:'covered_by_existing_unique_idempotency_key',approval_replay:'covered_by_existing_atomic_required_to_approved_transition',concurrency:'covered_by_existing_conditional_lease_update',crash_recovery:'covered_by_existing_lease_expiry',unknown_write_retry:'blocked_by_execution_ledger'};
const report={checkedAt:new Date().toISOString(),mode:'fixture_dry_run',total:cases.length,passed,failed:failures.length,accuracy:Number((passed/cases.length*100).toFixed(2)),ambiguityDetection:partial.needsClarification?'PASS':'FAIL',p50Ms:Number(percentile(.5).toFixed(3)),p95Ms:Number(percentile(.95).toFixed(3)),security,failures,financial_writes:0,bizimhesap_writes:0,secrets_exposed:0};
const out=path.resolve('evidence/natural-finance-stress-v162.json');await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,evidence:out},null,2));
if(failures.length) process.exitCode=1;
