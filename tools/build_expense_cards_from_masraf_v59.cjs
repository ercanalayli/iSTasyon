if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
const fs = require('fs');
const path = require('path');
const { loadAperionMemory, appendTransactionLog } = require('./aperion_memory.cjs');

const ROOT = path.resolve(__dirname, '..');
const input = process.argv[2] || path.join(ROOT, 'masraf_alayli_2026.json');
const output = process.argv[3] || path.join(ROOT, 'data', 'gider_kartlari_alayli_2026.json');
const MEMORY = loadAperionMemory();

const norm = (v) => String(v || '').toLocaleLowerCase('tr-TR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/Ä±/g, 'i').replace(/ÅŸ/g, 's').replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o');

function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function classify(row) {
  const text = norm([row.kategori, row.aciklama, row.tedarikci, row.raw?.text].filter(Boolean).join(' '));
  const out = {
    owner: 'ALAYLI',
    owner_type: 'business',
    main_category: 'DiÄŸer / Kontrol',
    sub_category: 'Kontrol Gerekli',
    expense_class: 'variable',
    card_name: 'DiÄŸer - Kontrol',
    status: 'control_required',
    reason: ''
  };

  if (/hayir|kurban|zekat/.test(text)) return { ...out, owner_type: 'personal', main_category: 'KiÅŸisel / Aile', sub_category: 'HayÄ±r / Kurban / Zekat', card_name: 'HayÄ±r / Kurban / Zekat', reason: 'Banka masrafÄ± deÄŸildir, kiÅŸisel/aile kontrolÃ¼ gerekir' };
  if (/okul|egitim/.test(text)) return { ...out, owner_type: 'family', main_category: 'KiÅŸisel / Aile', sub_category: 'Okul / EÄŸitim', card_name: 'Okul / EÄŸitim', reason: 'Personel gideri deÄŸildir, kontrol gerekir' };
  if (/iade/.test(text)) return { ...out, main_category: 'Ä°ade / Ters KayÄ±t', sub_category: 'SatÄ±ÅŸ Ä°adesi', expense_class: 'return', card_name: 'SatÄ±ÅŸ Ä°adesi / Ters KayÄ±t', status: 'mapped', reason: 'Normal gider deÄŸildir' };
  if (/urun alis|Ã¼rÃ¼n alÄ±ÅŸ|sonova|hasta bezi|tedarikciden alis|tedarikÃ§iden alÄ±ÅŸ/.test(text)) return { ...out, main_category: 'TedarikÃ§i / ÃœrÃ¼n AlÄ±ÅŸlarÄ±', sub_category: 'ÃœrÃ¼n AlÄ±ÅŸ', expense_class: 'stock_purchase', card_name: `ÃœrÃ¼n AlÄ±ÅŸ - ${row.tedarikci || 'TedarikÃ§i'}`, status: 'mapped' };
  if (/maas|maaÅŸ/.test(text)) return { ...out, main_category: 'Personel', sub_category: 'MaaÅŸ', expense_class: 'fixed', card_name: 'Personel MaaÅŸ', status: 'mapped' };
  if (/prim|hakedi/.test(text)) return { ...out, main_category: 'Personel', sub_category: 'Prim', card_name: 'Personel Prim', status: 'mapped' };
  if (/yol parasi|yol parasÄ±/.test(text)) return { ...out, main_category: 'Personel', sub_category: 'Yol ParasÄ±', card_name: 'Personel Yol ParasÄ±', status: 'mapped' };
  if (/yemek|tost/.test(text)) return { ...out, main_category: 'Yemek / AÄŸÄ±rlama', sub_category: 'Personel YemeÄŸi', card_name: 'Personel YemeÄŸi', status: 'mapped' };
  if (/sgk|ssk|vergi|stopaj|kdv/.test(text)) return { ...out, main_category: 'Vergi / SGK', sub_category: 'Resmi Ã–deme', expense_class: 'periodic', card_name: 'Vergi / SGK', status: 'mapped' };
  if (/kira/.test(text)) return { ...out, main_category: 'Kira / SÃ¶zleÅŸmeli', sub_category: 'Kira', expense_class: 'contractual', card_name: `Kira - ${row.tedarikci || 'ALAYLI'}`, status: 'mapped' };
  if (/aidat/.test(text)) return { ...out, main_category: 'Kira / SÃ¶zleÅŸmeli', sub_category: 'Aidat', expense_class: 'periodic', card_name: 'Aidat', status: 'mapped' };
  if (/elektrik|limak/.test(text)) return { ...out, main_category: 'Fatura / Abonelik', sub_category: 'Elektrik', expense_class: 'periodic', card_name: 'Elektrik - ALAYLI', status: 'mapped' };
  if (/su/.test(text)) return { ...out, main_category: 'Fatura / Abonelik', sub_category: 'Su', expense_class: 'periodic', card_name: 'Su - ALAYLI', status: 'mapped' };
  if (/iletisim|iletiÅŸim|telefon|internet|telekom|vodafone|turkcell|ttnet/.test(text)) return { ...out, main_category: 'Fatura / Abonelik', sub_category: 'Ä°letiÅŸim', expense_class: 'periodic', card_name: 'Ä°letiÅŸim - Åirket HatlarÄ±', status: 'mapped' };
  if (/isinma|Ä±sÄ±nma|dogalgaz|doÄŸalgaz/.test(text)) return { ...out, main_category: 'Fatura / Abonelik', sub_category: 'IsÄ±nma', expense_class: 'periodic', card_name: 'IsÄ±nma - ALAYLI', status: 'mapped' };
  if (/market|kahve|cay|Ã§ay|yumurta|mutfak/.test(text)) return { ...out, main_category: 'Market / Mutfak', sub_category: 'Mutfak / Ä°kram', card_name: 'Market - Mutfak / Ä°kram', status: 'mapped' };
  if (/temizlik|deterjan|sabun/.test(text)) return { ...out, main_category: 'Market / Mutfak', sub_category: 'Temizlik', card_name: 'Market - Temizlik', status: 'mapped' };
  if (/kargo|nakliye|tasima|taÅŸÄ±ma/.test(text)) return { ...out, main_category: 'Kargo / Nakliye', sub_category: 'Kargo', card_name: 'Kargo / Nakliye', status: 'mapped' };
  if (/yakit|yakÄ±t|akaryakit|benzin|mazot/.test(text)) return { ...out, main_category: 'AraÃ§ / YakÄ±t', sub_category: 'YakÄ±t', card_name: 'AraÃ§ YakÄ±t', status: 'mapped' };
  if (/banka|eft|havale|fast|bsmv|komisyon|masraf|ucret|Ã¼cret/.test(text)) return { ...out, main_category: 'Mali Giderler', sub_category: 'Banka MasrafÄ±', card_name: 'Banka MasrafÄ±', status: 'mapped' };
  return out;
}

const data = JSON.parse(fs.readFileSync(input, 'utf8'));
const rows = Array.isArray(data) ? data : data.kayitlar || data.rows || [];
const cardMap = new Map();
const movements = [];

for (const row of rows) {
  const c = classify(row);
  const amount = money(row.tutar ?? row.Toplam ?? row.toplam);
  const key = [c.card_name, c.main_category, c.sub_category].join('|');
  if (!cardMap.has(key)) cardMap.set(key, { ...c, movement_count: 0, total_amount: 0 });
  const card = cardMap.get(key);
  card.movement_count += 1;
  card.total_amount += amount;
  movements.push({
    tarih: row.tarih,
    tutar: amount,
    kaynak_kategori: row.kategori,
    aciklama: row.aciklama,
    tedarikci: row.tedarikci,
    gider_karti: c.card_name,
    ana_kategori: c.main_category,
    alt_kategori: c.sub_category,
    durum: c.status,
    kontrol_nedeni: c.reason
  });
}

const cards = [...cardMap.values()].sort((a, b) => b.total_amount - a.total_amount);
for (const cardName of MEMORY.expenseCardNames) {
  if (!cards.find(card => norm(card.card_name) === norm(cardName))) {
    cards.push({
      owner: MEMORY.config.active_company_id || 'alayli',
      owner_type: /kisisel|aile/i.test(cardName) ? 'personal' : 'business',
      main_category: 'Memory Template',
      sub_category: 'Hazir Kart',
      expense_class: 'template',
      card_name: cardName,
      status: 'memory_template',
      reason: 'aperion-memory/gider-kartlari.md icinden geldi',
      movement_count: 0,
      total_amount: 0
    });
  }
}
const report = {
  created_at: new Date().toISOString(),
  input,
  memory: {
    dir: MEMORY.dir,
    active_company: MEMORY.config.active_company || 'ALAYLI Medikal',
    gotcha_rules: MEMORY.gotchaRules.length,
    expense_card_templates: MEMORY.expenseCardNames.length
  },
  summary: {
    rows: rows.length,
    cards: cards.length,
    total_amount: movements.reduce((s, x) => s + x.tutar, 0),
    mapped: movements.filter(x => x.durum === 'mapped').length,
    control_required: movements.filter(x => x.durum !== 'mapped').length
  },
  cards,
  movements
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2), 'utf8');
appendTransactionLog(`${new Date().toISOString().slice(0, 10)} | ALAYLI | aperion | gider_kartlari_uretildi | ${path.basename(input)} | ${cards.length} kart | ${report.summary.total_amount.toFixed(2)} | ok`);
console.log(JSON.stringify(report.summary, null, 2));
console.log(output);

