if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..');
const positional = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const INPUT = positional[0] || path.join(ROOT, 'data', 'bizimhesap_fatura_detaylari_raw.json');
const OUTPUT = positional[1] || path.join(ROOT, 'data', 'bizimhesap_purchase_raw.json');
const COMMIT = process.argv.includes('--commit');
const url = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/,'');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const text = value => String(value ?? '').trim();
const norm = value => text(value).toLocaleUpperCase('tr-TR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const number = value => Number(value) || 0;
const round = value => Math.round((number(value) + Number.EPSILON) * 100) / 100;
const hash = parts => crypto.createHash('sha256').update(parts.map(text).join('|')).digest('hex');

function isPurchase(detail) {
  const source = norm([
    detail.fatura_tipi,
    detail.search_key,
    detail.aciklama,
    detail.raw_text,
  ].join(' '));
  return /ALIS|TEDARIKCI|GELEN E.?FATURA|PERAKENDE ALIS/.test(source)
    && !/SATIS IADESI|MUSTERIDEN IADE/.test(source);
}

function buildRows(report) {
  const rows = [];
  for (const detail of report.details || []) {
    if (detail.read_status !== 'ok' || !isPurchase(detail)) continue;
    for (const item of detail.kalemler || []) {
      const qty = number(item.miktar);
      const gross = number(item.satir_toplami);
      const vat = number(item.kdv_tutari);
      const net = gross && vat ? round(gross - vat) : gross;
      const unit = number(item.birim_fiyat) || (qty ? round(net / qty) : 0);
      const row = {
        firma_id: 'alayli',
        tarih: detail.fatura_tarihi || '',
        belge_no: detail.fatura_no || '',
        tedarikci: detail.cari_unvan || '',
        urun_kod: text(item.urun_kod || item.kod),
        barkod: text(item.barkod),
        urun: item.mal_hizmet || '',
        kategori: text(item.kategori),
        miktar: qty,
        birim: item.birim || '',
        alis_fiyat: unit,
        tutar: net,
        kaynak: 'bizimhesap_fatura_detayi',
        raw: {
          kdv_orani: number(item.kdv_orani),
          kdv_tutari: vat,
          net_alis_kdv_haric: net,
          net_alis_kdv_dahil: gross || round(net + vat),
          belge_pdf: detail.belge_pdf || '',
          belge_xml: detail.belge_xml || '',
          task_id: detail.task_id || '',
        },
      };
      row.hash = hash([row.firma_id, row.belge_no, row.urun_kod, row.urun, row.miktar, row.tutar]);
      if (row.tarih && row.belge_no && row.urun && row.miktar > 0) rows.push(row);
    }
  }
  return [...new Map(rows.map(row => [row.hash, row])).values()];
}

async function main() {
  const report = JSON.parse(fs.readFileSync(INPUT, 'utf8').replace(/^\uFEFF/, ''));
  const rows = buildRows(report);
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify({
    created_at: new Date().toISOString(),
    source: 'bizimhesap_fatura_detayi',
    firma_id: 'alayli',
    rows,
  }, null, 2), 'utf8');

  if (COMMIT && rows.length) {
    if (!url || !key) throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli');
    const cleanUrl = (url || '').replace(/\/rest\/v1\/?$/,'');
  const db = createClient(cleanUrl, key, { auth: { persistSession: false } });
    const { error } = await db.from('purchase_raw')
      .upsert(rows.map(row => ({ ...row, updated_at: new Date().toISOString() })), {
        onConflict: 'firma_id,hash',
      });
    if (error) throw new Error(`purchase_raw: ${error.message}`);
  }
  console.log(JSON.stringify({
    input_details: (report.details || []).length,
    verified_purchase_lines: rows.length,
    committed: Boolean(COMMIT && rows.length),
    output: OUTPUT,
  }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});



