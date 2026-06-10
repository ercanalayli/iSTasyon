const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const input = process.argv[2] || path.join(ROOT, 'masraf_alayli_2026.json');
const output = process.argv[3] || path.join(ROOT, 'data', 'gider_kartlari_alayli_2026.json');

const norm = (v) => String(v || '').toLocaleLowerCase('tr-TR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');

function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function classify(row) {
  const text = norm([row.kategori, row.aciklama, row.tedarikci, row.raw?.text].filter(Boolean).join(' '));
  const out = {
    owner: 'ALAYLI',
    owner_type: 'business',
    main_category: 'Diğer / Kontrol',
    sub_category: 'Kontrol Gerekli',
    expense_class: 'variable',
    card_name: 'Diğer - Kontrol',
    status: 'control_required',
    reason: ''
  };

  if (/hayir|kurban|zekat/.test(text)) return { ...out, owner_type: 'personal', main_category: 'Kişisel / Aile', sub_category: 'Hayır / Kurban / Zekat', card_name: 'Hayır / Kurban / Zekat', reason: 'Banka masrafı değildir, kişisel/aile kontrolü gerekir' };
  if (/okul|egitim/.test(text)) return { ...out, owner_type: 'family', main_category: 'Kişisel / Aile', sub_category: 'Okul / Eğitim', card_name: 'Okul / Eğitim', reason: 'Personel gideri değildir, kontrol gerekir' };
  if (/iade/.test(text)) return { ...out, main_category: 'İade / Ters Kayıt', sub_category: 'Satış İadesi', expense_class: 'return', card_name: 'Satış İadesi / Ters Kayıt', status: 'mapped', reason: 'Normal gider değildir' };
  if (/urun alis|ürün alış|sonova|hasta bezi|tedarikciden alis|tedarikçiden alış/.test(text)) return { ...out, main_category: 'Tedarikçi / Ürün Alışları', sub_category: 'Ürün Alış', expense_class: 'stock_purchase', card_name: `Ürün Alış - ${row.tedarikci || 'Tedarikçi'}`, status: 'mapped' };
  if (/maas|maaş/.test(text)) return { ...out, main_category: 'Personel', sub_category: 'Maaş', expense_class: 'fixed', card_name: 'Personel Maaş', status: 'mapped' };
  if (/prim|hakedi/.test(text)) return { ...out, main_category: 'Personel', sub_category: 'Prim', card_name: 'Personel Prim', status: 'mapped' };
  if (/yol parasi|yol parası/.test(text)) return { ...out, main_category: 'Personel', sub_category: 'Yol Parası', card_name: 'Personel Yol Parası', status: 'mapped' };
  if (/yemek|tost/.test(text)) return { ...out, main_category: 'Yemek / Ağırlama', sub_category: 'Personel Yemeği', card_name: 'Personel Yemeği', status: 'mapped' };
  if (/sgk|ssk|vergi|stopaj|kdv/.test(text)) return { ...out, main_category: 'Vergi / SGK', sub_category: 'Resmi Ödeme', expense_class: 'periodic', card_name: 'Vergi / SGK', status: 'mapped' };
  if (/kira/.test(text)) return { ...out, main_category: 'Kira / Sözleşmeli', sub_category: 'Kira', expense_class: 'contractual', card_name: `Kira - ${row.tedarikci || 'ALAYLI'}`, status: 'mapped' };
  if (/aidat/.test(text)) return { ...out, main_category: 'Kira / Sözleşmeli', sub_category: 'Aidat', expense_class: 'periodic', card_name: 'Aidat', status: 'mapped' };
  if (/elektrik|limak/.test(text)) return { ...out, main_category: 'Fatura / Abonelik', sub_category: 'Elektrik', expense_class: 'periodic', card_name: 'Elektrik - ALAYLI', status: 'mapped' };
  if (/su/.test(text)) return { ...out, main_category: 'Fatura / Abonelik', sub_category: 'Su', expense_class: 'periodic', card_name: 'Su - ALAYLI', status: 'mapped' };
  if (/iletisim|iletişim|telefon|internet|telekom|vodafone|turkcell|ttnet/.test(text)) return { ...out, main_category: 'Fatura / Abonelik', sub_category: 'İletişim', expense_class: 'periodic', card_name: 'İletişim - Şirket Hatları', status: 'mapped' };
  if (/isinma|ısınma|dogalgaz|doğalgaz/.test(text)) return { ...out, main_category: 'Fatura / Abonelik', sub_category: 'Isınma', expense_class: 'periodic', card_name: 'Isınma - ALAYLI', status: 'mapped' };
  if (/market|kahve|cay|çay|yumurta|mutfak/.test(text)) return { ...out, main_category: 'Market / Mutfak', sub_category: 'Mutfak / İkram', card_name: 'Market - Mutfak / İkram', status: 'mapped' };
  if (/temizlik|deterjan|sabun/.test(text)) return { ...out, main_category: 'Market / Mutfak', sub_category: 'Temizlik', card_name: 'Market - Temizlik', status: 'mapped' };
  if (/kargo|nakliye|tasima|taşıma/.test(text)) return { ...out, main_category: 'Kargo / Nakliye', sub_category: 'Kargo', card_name: 'Kargo / Nakliye', status: 'mapped' };
  if (/yakit|yakıt|akaryakit|benzin|mazot/.test(text)) return { ...out, main_category: 'Araç / Yakıt', sub_category: 'Yakıt', card_name: 'Araç Yakıt', status: 'mapped' };
  if (/banka|eft|havale|fast|bsmv|komisyon|masraf|ucret|ücret/.test(text)) return { ...out, main_category: 'Mali Giderler', sub_category: 'Banka Masrafı', card_name: 'Banka Masrafı', status: 'mapped' };
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
const report = {
  created_at: new Date().toISOString(),
  input,
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
console.log(JSON.stringify(report.summary, null, 2));
console.log(output);
