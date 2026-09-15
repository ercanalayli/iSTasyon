export const DESKTOP_TARGETS = Object.freeze({
  bizimhesap: {
    title: 'BizimHesap',
    url: 'https://bizimhesap.com/web/ngn/newportal',
    aliases: ['bizimhesap', 'bizim hesap', 'bizim hesabi', 'muhasebe']
  },
  gmail: {
    title: 'Gmail',
    url: 'https://mail.google.com/mail/u/0/#inbox',
    aliases: ['gmail', 'mail', 'e posta', 'eposta', 'gelen kutusu']
  },
  drive: {
    title: 'Google Drive',
    url: 'https://drive.google.com/drive/my-drive',
    aliases: ['drive', 'google drive']
  },
  calendar: {
    title: 'Google Takvim',
    url: 'https://calendar.google.com/calendar/u/0/r',
    aliases: ['takvim', 'calendar', 'google takvim']
  },
  telegram: {
    title: 'Telegram Web',
    url: 'https://web.telegram.org/k/',
    aliases: ['telegram', 'telegram web']
  },
  whatsapp: {
    title: 'WhatsApp Web',
    url: 'https://web.whatsapp.com/',
    aliases: ['whatsapp', 'whatsapp web']
  },
  aperion: {
    title: 'AperiON',
    url: 'https://aperion-istasyon.pages.dev/aperion-ust-akil',
    aliases: ['aperion', 'aperion paneli', 'istasyon', 'dashboard', 'panel']
  }
});

export function normalizeCommandText(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveDesktopTarget(normalized) {
  const stripped = normalized
    .replace(/^\/(ac|open)\s+/, '')
    .replace(/\s+(ac|acilsin|goster|getir|gir|giris yap)$/, '')
    .replace(/^(ac|goster|getir)\s+/, '')
    .trim();
  for (const [key, target] of Object.entries(DESKTOP_TARGETS)) {
    if (target.aliases.some((alias) => stripped === alias || stripped === `${alias}i` || stripped === `${alias}u` || stripped === `${alias}yi` || stripped === `${alias}yu`)) {
      return { key, ...target };
    }
  }
  return null;
}

function approvalCategory(normalized) {
  if (/\b(sil|iptal et|kaldir|temizle)\b/.test(normalized)) return 'delete';
  if (/\b(ode|odeme|gider(?:i)?|masraf(?:i)?|transfer|aktar|havale|eft|tahsilat|fatura (?:kes|olustur|hazirla)|satinal|satin al|siparis ver|para gonder)\b/.test(normalized)) return 'finance';
  if (/\b(mesaj(?:i)? gonder|mail(?:i)? gonder|e posta gonder|yanitla|paylas|yayinla|ara)\b/.test(normalized)) return 'communication';
  if (/\b(yetki ver|erisimi degistir|sifre|parola|otp|giris bilgisi)\b/.test(normalized)) return 'access';
  return null;
}

export const FINANCE_ACCOUNT_ALIASES = Object.freeze([
  { id: '1525267', name: 'Ercan Nakit Kasa', aliases: ['ercan nakit kasa', 'ercan nakit', 'ercan kasa', 'ercan nakite', 'ercan nakit kasaya'] },
  { id: '54795', name: 'TL Kasa', aliases: ['tl kasa', 'tl kasadan', 'tl kasaya'] },
  { id: '3160497', name: 'Vakıf Şirket', aliases: ['vakif sirket', 'vakifbank sirket', 'vakif bankasi'] },
  { id: '2827040', name: 'İş Bankası', aliases: ['is bankasi', 'isbank', 'is banka'] },
  { id: '1525257', name: 'Yapı Kredi Şirket', aliases: ['yapi kredi sirket', 'yapi kredi'] },
  { id: '57474', name: 'Akbank Şirket', aliases: ['akbank sirket', 'akbank'] },
  { id: '55197', name: 'Garanti Şirket', aliases: ['garanti sirket', 'garanti'] }
]);

function parseAmountNatural(normalized) {
  const match = normalized.match(/\b(\d[\d.,]*)(?:\s*(bin))?\s*(?:tl|try|lira)?\b/);
  if (!match) return null;
  let value = match[1];
  if (value.includes(',') && value.includes('.')) value = value.replace(/\./g, '').replace(',', '.');
  else if (value.includes(',')) value = value.replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) value = value.replace(/\./g, '');
  const amount = Number(value) * (match[2] ? 1000 : 1);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

function accountMentions(normalized) {
  const found = [];
  for (const account of FINANCE_ACCOUNT_ALIASES) {
    const matches = account.aliases.map(alias => ({alias,index:normalized.indexOf(alias)})).filter(x => x.index >= 0)
      .filter(x => !(account.id === '54795' && /^\d[\d.,]*\s*$/.test(normalized.slice(0,x.index))));
    if (matches.length) { const best=matches.sort((a,b) => b.alias.length-a.alias.length)[0]; found.push({ ...account, match:best.alias, index:best.index }); }
  }
  return found.sort((a,b) => a.index-b.index);
}

function hasDirectionalSuffix(normalized, mention, direction) {
  const suffixes = direction === 'source'
    ? ['dan', 'den', 'tan', 'ten']
    : ['a', 'e', 'ya', 'ye'];
  return suffixes.some((suffix) => new RegExp(`(?:^|\\s)${mention.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*${suffix}(?:\\s|$)`).test(normalized));
}

export function resolveFinanceCandidates(query, { entityType = 'account', limit = 5 } = {}) {
  const normalized = normalizeCommandText(query);
  const terms = normalized.split(' ').filter(Boolean);
  return FINANCE_ACCOUNT_ALIASES
    .map((account) => {
      const searchable = normalizeCommandText([account.name, ...account.aliases].join(' '));
      const score = terms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0);
      return { entityType, id: account.id, label: account.name, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'tr'))
    .slice(0, Math.max(1, Math.min(5, limit)));
}

export function buildFinanceInteraction(parsed, { candidates = [], expiresAt = null } = {}) {
  if (!parsed) return null;
  const missing = parsed.missingFields || [];
  if (parsed.needsClarification && missing.length === 1 && candidates.length) {
    return {
      status: 'selection_required',
      selection_is_approval: false,
      known_fields: {
        amount: parsed.amount, currency: parsed.currency, operation: parsed.operation,
        source_account: parsed.sourceAccount || null, target_account: parsed.targetAccount || null
      },
      missing_field: missing[0],
      prompt: missing[0] === 'target_account' ? 'Hangi hedef hesap?' : 'Hangi kaynak hesap?',
      choices: candidates.slice(0, 5).map((candidate) => ({
        choice_id: `${missing[0]}:${candidate.id}`,
        label: candidate.label,
        action: 'select'
      })),
      other_action: { choice_id: `${missing[0]}:other`, label: 'DİĞER', action: 'other' },
      expires_at: expiresAt,
      financial_write: 0,
      bizimhesap_write: 0
    };
  }
  if (!parsed.needsClarification) {
    const route = parsed.operation === 'transfer'
      ? `${parsed.sourceAccount} → ${parsed.targetAccount}`
      : `${parsed.sourceAccount || parsed.account || ''}`;
    return {
      status: 'approval_required',
      final_summary: `${Number(parsed.amount).toLocaleString('tr-TR')} ${parsed.currency || 'TRY'}\n${route}`.trim(),
      actions: [
        { action: 'approve', label: 'ONAYLA' },
        { action: 'cancel', label: 'İPTAL' }
      ],
      approval_policy: 'explicit_single_use',
      approval_expires_at: expiresAt,
      financial_write: 0,
      bizimhesap_write: 0
    };
  }
  return { status: 'needs_clarification', missing_fields: missing, financial_write: 0, bizimhesap_write: 0 };
}

function clarification(base, missing, question) {
  return { ...base, status:'needs_clarification', needsClarification:true, missingFields:missing, clarificationQuestion:question,
    executionMode:'prepare_only', approvalPolicy:'explicit_single_use', approvalRequired:true, financialWrite:0, bizimhesapWrite:0 };
}

function parseNaturalFinance(normalized, rawText) {
  if (/\b(belki|olabilir|veya|ya da)\b/.test(normalized)) return null;
  const accounts = accountMentions(normalized);
  const expense = /\b(gider\w*|masraf\w*|verdim|harcadim|cay\w*|ikram\w*)\b/.test(normalized);
  const directionalTransfer = (accounts.some(a => hasDirectionalSuffix(normalized, a.match, 'source')) &&
    accounts.some(a => hasDirectionalSuffix(normalized, a.match, 'target'))) ||
    (/\b(kasadan|hesaptan|bankadan)\b/.test(normalized) && accounts.length > 0 && !expense);
  const transfer = /\b(transfer|aktar|havale|virman)\b/.test(normalized) || directionalTransfer;
  const collection = /\b(tahsilat\w*|tahsil ettim|para aldim)\b/.test(normalized);
  const payment = /\b(odeme|odedim|ode)\b/.test(normalized);
  const invoiceDraft = normalized.includes('fatura') && (normalized.includes('taslak') || normalized.includes('taslag') || normalized.includes('hazirla') || normalized.includes('olustur'));
  const query = /\b(sorgu\w*|goster|getir|nedir|kac|bakiye|satis\w*|cari\w*|hesap durumu)\b/.test(normalized) && !transfer && !expense && !collection && !payment && !invoiceDraft;
  if (!transfer && !expense && !collection && !payment && !invoiceDraft && !query) return null;
  const amount = parseAmountNatural(normalized);
  const base = { category:'finance', parsedScope:'ALAYLI', currency:'TRY', rawText, target:'BizimHesap' };
  if (query) return { ...base, code:/\bsatis\b/.test(normalized)?'bizimhesap.sales_analysis':/\bcari\b/.test(normalized)?'bizimhesap.cari_snapshot':'bizimhesap.balance_query', risk:'low_risk', approvalPolicy:'none', executionMode:'read_only', amount:null };
  const common = { ...base, risk:'approval_required', approvalPolicy:'explicit_single_use', executionMode:'prepare_only', amount };
  if (!amount) return clarification({ ...common, ...(invoiceDraft?{code:'bizimhesap.invoice_draft',operation:'fatura_taslagi'}:{}) }, ['amount'], 'Tutar nedir?');
  if (transfer) {
    let source = accounts.find(a => hasDirectionalSuffix(normalized, a.match, 'source'));
    let target = accounts.find(a => hasDirectionalSuffix(normalized, a.match, 'target'));
    if (!target && !source && accounts.length === 1 && /\b(kasadan|hesaptan|bankadan)\b/.test(normalized)) target = accounts[0];
    if (!source && accounts.length > 1) source = accounts[0];
    if (!target && accounts.length > 1) target = accounts.find(a => a.id !== source?.id) || null;
    const parsed = { ...common, code:'bizimhesap.cash_transfer_post', operation:'transfer', sourceAccount:source?.name || null, sourceAccountId:source?.id || null, targetAccount:target?.name || null, targetAccountId:target?.id || null };
    const missing = []; if (!source) missing.push('source_account'); if (!target) missing.push('target_account');
    if (missing.length) return clarification(parsed, missing, missing.length === 1 && missing[0] === 'source_account' ? `${amount.toLocaleString('tr-TR')} TL transfer. Hedef: ${target?.name || 'belirsiz'}. Kaynak kasa/hesap hangisi?` : missing.length === 1 ? `${amount.toLocaleString('tr-TR')} TL transfer. Kaynak: ${source?.name || 'belirsiz'}. Hedef kasa/hesap hangisi?` : `${amount.toLocaleString('tr-TR')} TL transfer için kaynak ve hedef hesap hangileri?`);
    if (source.id === target.id) return clarification(parsed, ['source_account','target_account'], 'Kaynak ve hedef aynı hesap görünüyor. Doğru iki hesabı belirtir misiniz?');
    return { ...parsed, status:'approval_required', duplicateCheck:'required' };
  }
  if (expense) {
    const source = accounts[0] || null;
    const parsed = { ...common, code:'bizimhesap.expense_post', operation:'gider', expenseCategory:/\b(cay|ikram)\b/.test(normalized)?'Çay / İkram':'Genel Gider', sourceAccount:source?.name || null, sourceAccountId:source?.id || null };
    return source ? { ...parsed, status:'approval_required', duplicateCheck:'required' } : clarification(parsed, ['source_account'], `${amount.toLocaleString('tr-TR')} TL gider. Hangi kasa/hesaptan ödendi?`);
  }
  const operation = collection ? 'tahsilat' : payment ? 'odeme' : 'fatura_taslagi';
  const code = collection?'bizimhesap.collection_draft':payment?'bizimhesap.payment_draft':'bizimhesap.invoice_draft';
  return { ...common, code, operation, status:'approval_required', duplicateCheck:'required' };
}

function parseFinanceExpense(normalized, rawText) {
  if (!/\b(?:gider|masraf)(?:i)?\b/.test(normalized) || !/\b(?:kasa|banka|nakit)\b/.test(normalized)) return null;
  const amountMatch = normalized.match(/\b(\d[\d.,]*)\s*(?:tl|try)\b/);
  if (!amountMatch) return null;
  let amountText = amountMatch[1];
  if (amountText.includes(',') && amountText.includes('.')) amountText = amountText.replace(/\./g, '').replace(',', '.');
  else if (amountText.includes(',')) amountText = amountText.replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(amountText)) amountText = amountText.replace(/\./g, '');
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const ercanCash = /\bercan\s+nakit\s+kasa\b/.test(normalized);
  const tea = /\b(?:cay|ikram)\b/.test(normalized);
  return {
    code: 'bizimhesap.expense_post',
    category: 'finance',
    risk: 'approval_required',
    approvalPolicy: 'explicit_single_use',
    executionMode: 'prepare_only',
    parsedScope: 'ALAYLI',
    amount,
    currency: 'TRY',
    expenseCategory: tea ? 'Çay / İkram' : 'Genel Gider',
    sourceAccount: ercanCash ? 'Ercan Nakit Kasa' : null,
    sourceAccountId: ercanCash ? '1525267' : null,
    target: 'BizimHesap',
    duplicateCheck: 'required',
    rawText
  };
}

function looksLikeCommand(normalized) {
  return /\b(ac|goster|getir|bul|ara|kontrol et|raporla|ozetle|ekle|kaydet|hatirlat|olustur|hazirla|gonder|sil|degistir|guncelle|baslat|durdur|ode|aktar|transfer|gir|cik)\b/.test(normalized);
}

export function parseUniversalCommand(text) {
  const rawText = String(text || '').trim();
  const normalized = normalizeCommandText(rawText);
  if (!normalized) return null;
  if (/\b(belki|olabilir|veya|ya da)\b/.test(normalized)) return null;

  const desktopTarget = resolveDesktopTarget(normalized);
  if (desktopTarget) {
    return {
      code: 'desktop_open',
      category: 'desktop',
      risk: 'low_risk',
      approvalPolicy: 'none',
      executionMode: 'desktop_queue',
      target: desktopTarget.key,
      targetTitle: desktopTarget.title,
      rawText
    };
  }

  const naturalFinance = parseNaturalFinance(normalized, rawText);
  if (naturalFinance) return naturalFinance;

  const sensitiveCategory = approvalCategory(normalized);
  if (sensitiveCategory) {
    return {
      code: 'approval_request',
      category: sensitiveCategory,
      risk: 'approval_required',
      approvalPolicy: 'single_use_explicit',
      executionMode: 'prepare_only',
      rawText
    };
  }

  // Güvenli ve tanınmış bir yeteneğe eşleşmeyen gündelik istekleri burada
  // "komut kuyruğu"na hapsetme. Webhook bunları bir sonraki adımda genel
  // AperiON konuşma aklına verir. Böylece kullanıcı komut ezberlemez;
  // dış etki doğuran işlemler ise yukarıdaki onay sınıflandırmasında kalır.
  return null;
}

export function continueUniversalCommand(previous, answer) {
  if (!previous?.needsClarification || !Array.isArray(previous.missingFields)) return parseUniversalCommand(answer);
  const normalized = normalizeCommandText(answer); const accounts = accountMentions(normalized); const amount = parseAmountNatural(normalized);
  const next = { ...previous, rawText:`${previous.rawText} | clarification: ${String(answer || '').trim()}` };
  if (previous.missingFields.includes('amount') && amount) next.amount = amount;
  if (accounts.length) {
    if (previous.missingFields.includes('source_account')) { next.sourceAccount=accounts[0].name; next.sourceAccountId=accounts[0].id; }
    else if (previous.missingFields.includes('target_account')) { next.targetAccount=accounts[0].name; next.targetAccountId=accounts[0].id; }
  }
  const missing = previous.missingFields.filter(field => field === 'amount' ? !next.amount : field === 'source_account' ? !next.sourceAccount : field === 'target_account' ? !next.targetAccount : true);
  if (missing.length) return clarification(next, missing, missing[0] === 'amount'?'Tutar nedir?':missing[0] === 'source_account'?'Kaynak kasa/hesap hangisi?':'Hedef kasa/hesap hangisi?');
  if (next.sourceAccountId && next.targetAccountId && next.sourceAccountId === next.targetAccountId) return clarification(next,['source_account','target_account'],'Kaynak ve hedef aynı hesap görünüyor. Doğru iki hesabı belirtir misiniz?');
  return { ...next, status:'approval_required', needsClarification:false, missingFields:[], clarificationQuestion:null, duplicateCheck:'required' };
}

export function desktopTargetSummary() {
  return Object.values(DESKTOP_TARGETS).map((target) => target.title).join(', ');
}
