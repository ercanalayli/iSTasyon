/* AperiON Finance Calendar Normalizer v47
   Purpose: normalize CSV/Excel/Telegram finance calendar rows into finance_calendar_items format.
   Safe rule: no database write. Preview + validation first.
*/

function clean(value){ return String(value ?? '').trim(); }
function num(value){
  if(value === null || value === undefined) return 0;
  return Number(String(value).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'')) || 0;
}
function pick(row, keys){
  for(const k of keys){
    if(row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
  }
  return '';
}
function normalizeDate(value){
  const v = clean(value);
  if(!v) return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})$/);
  if(m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return v;
}
function normalizeItemType(value){
  const v = clean(value).toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c');
  const map = {
    'odenecek':'payable','ödeme':'payable','odeme':'payable','payable':'payable',
    'tahsil':'receivable','tahsilat':'receivable','alacak':'receivable','receivable':'receivable',
    'gorev':'task','görev':'task','task':'task',
    'onay':'approval','approval':'approval',
    'kredi':'credit','credit':'credit',
    'kredi karti':'credit_card','kredi kartı':'credit_card','kart':'credit_card','credit_card':'credit_card',
    'cek':'check','çek':'check','senet':'check','check':'check',
    'not':'note','note':'note',
    'moka':'moka','moka united':'moka',
    'sabit odeme':'fixed_payment','sabit ödeme':'fixed_payment','fixed_payment':'fixed_payment',
    'degisken gider':'variable_expense','değişken gider':'variable_expense','variable_expense':'variable_expense'
  };
  return map[v] || v || 'payable';
}
function inferDirection(itemType, value){
  const explicit = clean(value).toLowerCase();
  if(['in','giris','giriş','gelir','tahsil'].includes(explicit)) return 'in';
  if(['out','cikis','çıkış','gider','odeme','ödeme'].includes(explicit)) return 'out';
  if(['neutral','notr','nötr'].includes(explicit)) return 'neutral';
  if(['receivable','moka'].includes(itemType)) return 'in';
  if(['task','approval','note'].includes(itemType)) return 'neutral';
  return 'out';
}
function normalizeStatus(value){
  const v = clean(value).toLowerCase();
  const map = {'açık':'open','acik':'open','bekliyor':'open','open':'open','kismi':'partial','kısmi':'partial','partial':'partial','tamam':'done','done':'done','kapali':'done','kapalı':'done','ertelendi':'postponed','postponed':'postponed','iptal':'cancelled','cancelled':'cancelled','onay bekliyor':'waiting_approval','waiting_approval':'waiting_approval'};
  return map[v] || v || 'open';
}
function normalizePriority(value){
  const v = clean(value).toLowerCase();
  const map = {'dusuk':'low','düşük':'low','low':'low','normal':'normal','yuksek':'high','yüksek':'high','high':'high','kritik':'critical','critical':'critical'};
  return map[v] || 'normal';
}
function normalizeFixedVariable(value){
  const v = clean(value).toLowerCase();
  if(['sabit','fixed'].includes(v)) return 'fixed';
  if(['degisken','değişken','variable'].includes(v)) return 'variable';
  return 'variable';
}
function normalizeFinanceCalendarRow(row, defaults = {}){
  const itemType = normalizeItemType(pick(row, ['item_type','tip','Tür','Tur','tür','islem_tipi','İşlem Tipi']));
  const itemDate = normalizeDate(pick(row, ['item_date','tarih','Tarih','vade','Vade','due_date','ödeme tarihi','odeme tarihi'])) || defaults.item_date || null;
  const originalDueDate = normalizeDate(pick(row, ['original_due_date','asıl vade','asil vade','Vade Tarihi','vade_tarihi'])) || itemDate;
  const direction = inferDirection(itemType, pick(row, ['direction','yön','yon','giriş çıkış','giris cikis']));
  const expectedAmount = num(pick(row, ['expected_amount','tutar','Tutar','beklenen_tutar','Beklenen Tutar','amount','borç','borc','alacak']));
  return {
    company: clean(pick(row, ['company','firma','Firma'])) || defaults.company || 'ALAYLI',
    item_date: itemDate,
    original_due_date: originalDueDate,
    effective_due_date: normalizeDate(pick(row, ['effective_due_date','fiili_tarih','Fiili Tarih'])) || null,
    item_type: itemType,
    direction,
    title: clean(pick(row, ['title','başlık','baslik','Açıklama','Aciklama','açıklama','aciklama'])) || `${itemType} ${itemDate || ''}`.trim(),
    description: clean(pick(row, ['description','detay','Detay','not','Not'])) || null,
    cari_name: clean(pick(row, ['cari_name','cari','Cari','müşteri','musteri','tedarikçi','tedarikci'])) || null,
    account_name: clean(pick(row, ['account_name','hesap','Hesap','banka','Banka','kasa','Kasa'])) || null,
    category: clean(pick(row, ['category','kategori','Kategori'])) || null,
    expected_amount: expectedAmount,
    paid_amount: num(pick(row, ['paid_amount','ödenen','odenen','Ödenen'])) || 0,
    collected_amount: num(pick(row, ['collected_amount','tahsil','tahsil_edilen','Tahsil Edilen'])) || 0,
    status: normalizeStatus(pick(row, ['status','durum','Durum'])) || defaults.status || 'open',
    priority: normalizePriority(pick(row, ['priority','öncelik','oncelik','Öncelik'])) || 'normal',
    fixed_or_variable: normalizeFixedVariable(pick(row, ['fixed_or_variable','sabit_degisken','Sabit/Değişken'])) || 'variable',
    source_type: clean(pick(row, ['source_type','kaynak','Kaynak'])) || defaults.source_type || 'excel',
    source_table: clean(pick(row, ['source_table'])) || null,
    source_id: num(pick(row, ['source_id'])) || null,
    telegram_message_id: clean(pick(row, ['telegram_message_id'])) || null,
    note: clean(pick(row, ['note','not','Not'])) || null
  };
}
function normalizeFinanceCalendarRows(rows, defaults = {}){
  return (rows || []).map(r => normalizeFinanceCalendarRow(r, defaults));
}
function validateFinanceCalendarRows(rows){
  const errors = [];
  (rows || []).forEach((r, index) => {
    if(!r.company) errors.push({index, field:'company', message:'company missing'});
    if(!r.item_date) errors.push({index, field:'item_date', message:'date missing'});
    if(!r.item_type) errors.push({index, field:'item_type', message:'item type missing'});
    if(!r.direction) errors.push({index, field:'direction', message:'direction missing'});
    if(!r.title) errors.push({index, field:'title', message:'title missing'});
    if(!['task','approval','note'].includes(r.item_type) && Number(r.expected_amount || 0) <= 0) errors.push({index, field:'expected_amount', message:'amount must be positive for financial item'});
  });
  return errors;
}
function summarizeFinanceCalendarRows(rows){
  const list = rows || [];
  return {
    total: list.length,
    in_count: list.filter(r => r.direction === 'in').length,
    out_count: list.filter(r => r.direction === 'out').length,
    neutral_count: list.filter(r => r.direction === 'neutral').length,
    total_in: list.filter(r => r.direction === 'in').reduce((a,r) => a + Number(r.expected_amount || 0), 0),
    total_out: list.filter(r => r.direction === 'out').reduce((a,r) => a + Number(r.expected_amount || 0), 0),
    tasks: list.filter(r => r.item_type === 'task').length,
    approvals: list.filter(r => r.item_type === 'approval').length
  };
}

if(typeof module !== 'undefined'){
  module.exports = {
    normalizeDate,
    normalizeItemType,
    inferDirection,
    normalizeFinanceCalendarRow,
    normalizeFinanceCalendarRows,
    validateFinanceCalendarRows,
    summarizeFinanceCalendarRows
  };
}
