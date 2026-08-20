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
  if (/\b(ode|odeme|transfer|aktar|havale|eft|tahsilat|fatura kes|satinal|satin al|siparis ver|para gonder)\b/.test(normalized)) return 'finance';
  if (/\b(mesaj(?:i)? gonder|mail(?:i)? gonder|e posta gonder|yanitla|paylas|yayinla|ara)\b/.test(normalized)) return 'communication';
  if (/\b(yetki ver|erisimi degistir|sifre|parola|otp|giris bilgisi)\b/.test(normalized)) return 'access';
  return null;
}

function looksLikeCommand(normalized) {
  return /\b(ac|goster|getir|bul|ara|kontrol et|raporla|ozetle|ekle|kaydet|hatirlat|olustur|hazirla|gonder|sil|degistir|guncelle|baslat|durdur|ode|aktar|transfer|gir|cik)\b/.test(normalized);
}

export function parseUniversalCommand(text) {
  const rawText = String(text || '').trim();
  const normalized = normalizeCommandText(rawText);
  if (!normalized) return null;

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

  if (/^\/komut\s+/.test(normalized) || looksLikeCommand(normalized)) {
    return {
      code: 'command_request',
      category: 'general',
      risk: 'low_risk',
      approvalPolicy: 'review_if_unmapped',
      executionMode: 'review_queue',
      rawText: rawText.replace(/^\/komut\s+/iu, '').trim() || rawText
    };
  }
  return null;
}

export function desktopTargetSummary() {
  return Object.values(DESKTOP_TARGETS).map((target) => target.title).join(', ');
}
