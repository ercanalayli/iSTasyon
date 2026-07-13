#!/usr/bin/env node
/* Build the public, product-level FIFO package from the two local BizimHesap exports. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..');
const DOWNLOADS = process.env.APERION_REPORTS_DIR || path.join(process.env.USERPROFILE || '', 'Downloads');
const OUT = path.join(ROOT, 'hasta-bezi', 'fifo_chunks');
const CHUNK_SIZE = 240000;

function clean(v) { return String(v == null ? '' : v).trim(); }
function norm(v) { return clean(v).replace(/[ıİ]/g, 'I').replace(/[şŞ]/g, 'S').replace(/[ğĞ]/g, 'G').replace(/[üÜ]/g, 'U').replace(/[öÖ]/g, 'O').replace(/[çÇ]/g, 'C').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function num(v) { if (typeof v === 'number') return Number.isFinite(v) ? v : 0; const x = Number(clean(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')); return Number.isFinite(x) ? x : 0; }
function date(v) { if (v instanceof Date && !Number.isNaN(v.valueOf())) return v; if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d)); } const m = clean(v).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null; }
function iso(d) { return d ? d.toISOString().slice(0, 10) : ''; }
function find(kind) { const no = kind === 'sales' ? '(24).XLSX' : '(5).XLSX'; const start = kind === 'sales' ? 'SAT' : 'ALI'; return fs.readdirSync(DOWNLOADS).filter(n => n.toUpperCase().startsWith(start) && n.toUpperCase().endsWith(no)).sort((a,b) => fs.statSync(path.join(DOWNLOADS,b)).size - fs.statSync(path.join(DOWNLOADS,a)).size)[0]; }
function read(kind) {
  const file = find(kind); if (!file) throw new Error(`${kind} report missing`);
  const book = XLSX.readFile(path.join(DOWNLOADS, file), { cellDates: true, raw: true });
  const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: null, raw: true });
  const cols = {}; (rows[2] || []).forEach((h, i) => cols[norm(h)] = i);
  return rows.slice(3).map(r => ({
    date: date(r[cols.TARIH]), product: clean(r[cols.URUN]), category: clean(r[cols.KATEGORI]) || 'KATEGORISIZ', brand: clean(r[cols.MARKA]), barcode: clean(r[cols.BARKOD]), code: clean(r[cols.KOD]),
    qty: num(r[cols.MIKTAR]), net: num(r[cols.NET]), sourceCost: num(r[cols.ALISFIYATI])
  })).filter(r => r.date && r.product && (r.qty || r.net));
}
function key(row) { return row.barcode ? `B:${norm(row.barcode)}` : row.code ? `K:${norm(row.code)}` : `U:${norm(row.product)}`; }
function round(v) { return Math.round((v || 0) * 10000) / 10000; }
function main() {
  const purchases = read('purchase'); const sales = read('sales');
  const all = purchases.map(r => ({...r, type:'purchase'})).concat(sales.map(r => ({...r, type:'sale'}))).sort((a,b) => a.date - b.date || (a.type === 'purchase' ? -1 : 1));
  const lots = new Map(), product = new Map(), moves = {}, warnings = [];
  for (const row of all) {
    const k = key(row); let p = product.get(k);
    if (!p) { p = { key:k, product:row.product, brand:row.brand, category:row.category, barcode:row.barcode, code:row.code, buyQty:0,saleQty:0,stock:0,missing:0,buyNet:0,salesNet:0,fifo:0,profit:0,buyRows:0,saleRows:0 }; product.set(k,p); moves[k]=[]; lots.set(k,[]); }
    if (row.type === 'purchase') {
      const unit = row.qty ? row.net / row.qty : 0;
      lots.get(k).push({ qty: row.qty, unit }); p.buyQty += row.qty; p.stock += row.qty; p.buyNet += row.net; p.buyRows += 1;
      moves[k].push([iso(row.date),'ALIS','GIZLI KAYNAK','',row.qty,0,round(unit),0,0,round(row.net),0,0,0,round(p.stock),'OK','BIZIMHESAP_ALIS']);
      continue;
    }
    let needed = row.qty, cost = 0, used = 0; const queue = lots.get(k);
    while (needed > 0.000001 && queue.length) { const lot = queue[0], take = Math.min(needed, lot.qty); cost += take * lot.unit; used += take; lot.qty -= take; needed -= take; if (lot.qty < 0.000001) queue.shift(); }
    if (needed > 0.000001) { const fallback = row.sourceCost || (row.qty ? row.net / row.qty : 0); cost += needed * fallback; p.missing += needed; warnings.push({ key:k, product:p.product, date:iso(row.date), missing:round(needed) }); }
    const unitSale = row.qty ? row.net / row.qty : 0; const profit = row.net - cost; p.saleQty += row.qty; p.stock -= row.qty; p.salesNet += row.net; p.fifo += cost; p.profit += profit; p.saleRows += 1;
    moves[k].push([iso(row.date),'SATIS','GIZLI KAYNAK','',0,row.qty,0,round(unitSale),round(row.qty ? cost / row.qty : 0),round(row.net),round(cost),round(profit),round(row.net ? profit / row.net * 100 : 0),round(p.stock),needed > 0.000001 ? 'UYARI_EKSIK_ALIS' : 'OK',needed > 0.000001 ? 'SATIS_ALIS_FIYATI_FALLBACK' : 'FIFO']);
  }
  const summary = [...product.values()].map(p => [p.key,p.product,p.brand,p.category,'',p.barcode,p.code,round(p.buyQty),round(p.saleQty),round(p.stock),round(p.missing),round(p.buyNet),round(p.salesNet),round(p.fifo),round(p.profit),round(p.salesNet ? p.profit / p.salesNet * 100 : 0),round(p.fifo ? p.profit / p.fifo * 100 : 0),p.buyRows,p.saleRows]).sort((a,b) => b[12]-a[12]);
  const pack = { meta:{ updateNo:new Date().toISOString().replace(/[-:TZ.]/g,'').slice(8,18), source:'BizimHesap purchase/sales reports', summaryCount:summary.length, moveCount:all.length, salesCount:sales.length, warningCount:warnings.length, dateRange:{from:iso(all[0].date),to:iso(all[all.length-1].date)} }, summary, moves };
  const encoded = zlib.gzipSync(Buffer.from(JSON.stringify(pack))).toString('base64');
  fs.mkdirSync(OUT,{recursive:true});
  for (const file of fs.readdirSync(OUT)) if (/^fifo_b64_\d+\.txt$/i.test(file)) fs.unlinkSync(path.join(OUT,file));
  const files=[]; for(let i=0;i<encoded.length;i+=CHUNK_SIZE){const name=`fifo_b64_${String(files.length+1).padStart(3,'0')}.txt`;fs.writeFileSync(path.join(OUT,name),encoded.slice(i,i+CHUNK_SIZE),'utf8');files.push(name);}
  fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({type:'gz-base64',build:pack.meta.updateNo,encoding:'gzip+base64',files,summaryCount:summary.length,moveCount:all.length,salesCount:sales.length,warningCount:warnings.length},null,2)+'\n','utf8');
  fs.writeFileSync(path.join(ROOT,'data','hasta_bezi_fifo_build_proof.json'),JSON.stringify({created_at:new Date().toISOString(),meta:pack.meta,warnings:warnings.slice(0,100)},null,2)+'\n','utf8');
  console.log(`RESULT: OK - ${summary.length} products, ${all.length} movements, ${sales.length} sales, ${warnings.length} FIFO fallback warnings, ${files.length} public chunks.`);
}
main();
