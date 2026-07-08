const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const out = valueArg('--out', 'data/aperion_bank_approval_unified_status.json');

const FILES = {
  status: 'data/aperion_bank_approval_status.json',
  candidates: 'data/banka_onay_guvenli_adaylar.json',
  dryCheck: 'data/banka_onay_kuyruk_kaniti.json',
  queueProof: 'data/banka_onay_aday_kanit_durumu.json',
  queueDryRun: 'data/bizimhesap_queue_dryrun.json',
  postingPlan: 'data/banka_onay_bizimhesap_kayit_plani.json',
};

function valueArg(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function readJson(file) {
  if (!fs.existsSync(file)) {
    return { exists: false, data: null, error: null };
  }
  try {
    return { exists: true, data: JSON.parse(fs.readFileSync(file, 'utf8')), error: null };
  } catch (error) {
    return { exists: true, data: null, error: error.message || String(error) };
  }
}

function writeJson(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(body, null, 2), 'utf8');
}

function arrayCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function compactCandidate(candidate = null) {
  if (!candidate) return null;
  const plan = candidate.plan || candidate;
  return {
    pending_bank_movement_id: candidate.pending_bank_movement_id || plan.pending_bank_movement_id || candidate.id || '',
    bank_name: candidate.bank_name || plan.bank_name || '',
    transaction_date: candidate.transaction_date || plan.date || '',
    transaction_time: candidate.transaction_time || plan.time || '',
    amount: Number(candidate.amount || plan.amount || candidate.amount_in || 0),
    type: candidate.type || plan.type || '',
    target: candidate.target || plan.target || '',
    source_account: candidate.source_account || plan.source_account || '',
    target_account: candidate.target_account || plan.target_account || candidate.account || plan.account || '',
    counterparty: candidate.counterparty || plan.counterparty || '',
    category: candidate.category || plan.category || '',
    confidence: Number(candidate.confidence || plan.confidence || 0),
    risk_class: candidate.risk_class || '',
    requires_user_review: Boolean(candidate.requires_user_review || plan.requires_user_review),
    reasons: candidate.reasons || plan.reasons || [],
  };
}

function buildReport() {
  const loaded = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, { file, ...readJson(file) }]));
  const status = loaded.status.data || {};
  const candidates = loaded.candidates.data || {};
  const dryCheck = loaded.dryCheck.data || {};
  const queueProof = loaded.queueProof.data || {};
  const queueDryRun = loaded.queueDryRun.data || {};
  const postingPlan = loaded.postingPlan.data || {};

  const missing_files = Object.values(loaded).filter(x => !x.exists).map(x => x.file);
  const parse_errors = Object.values(loaded).filter(x => x.error).map(x => ({ file: x.file, error: x.error }));

  const selected = compactCandidate(
    status.selected_candidate ||
    dryCheck.candidate ||
    queueProof.selected_candidate ||
    candidates.recommended_first_approval ||
    null
  );

  const candidateList = [
    candidates.recommended_first_approval,
    ...(Array.isArray(candidates.candidates) ? candidates.candidates : []),
  ].filter(Boolean).map(compactCandidate);

  const plans = Array.isArray(postingPlan.plans) ? postingPlan.plans : [];
  const queueRows = Array.isArray(queueDryRun.queue) ? queueDryRun.queue : Array.isArray(queueDryRun.items) ? queueDryRun.items : [];

  const blockers = [];
  if (missing_files.length) blockers.push('Bazı kanıt dosyaları repo içinde yok veya workflow tarafından üretilmemiş.');
  if (parse_errors.length) blockers.push('Bazı JSON dosyaları okunamadı.');
  if (!selected) blockers.push('Seçili banka adayı yok.');
  if (status.live_bizimhesap_save_called) blockers.push('Durum dosyası canlı BizimHesap save çalıştığını söylüyor; elle doğrulama gerekir.');
  if (selected && selected.requires_user_review) blockers.push('Seçili aday kullanıcı incelemesi istiyor.');
  if (selected && selected.confidence && selected.confidence < 84) blockers.push(`Seçili aday güveni düşük: ${selected.confidence}`);

  const safe_to_post = false;

  return {
    created_at: new Date().toISOString(),
    safe_mode: true,
    live_rpc_called: Boolean(status.live_rpc_called),
    live_bizimhesap_save_called: Boolean(status.live_bizimhesap_save_called),
    safe_to_post,
    policy: 'Bu rapor sadece okuma/dry-run raporudur. Kullanıcı açık onayı ve canlı doğrulama olmadan BizimHesap kaydı yapılmaz.',
    files: Object.fromEntries(Object.entries(loaded).map(([key, info]) => [key, {
      path: info.file,
      exists: info.exists,
      parse_error: info.error,
    }])),
    summary: {
      status_preview_count: Number(status?.summary?.preview_count || 0),
      status_candidate_count: Number(status?.summary?.candidate_count || 0),
      status_low_risk_count: Number(status?.summary?.low_risk_count || 0),
      status_review_count: Number(status?.summary?.review_count || 0),
      status_ready_queue_count: Number(status?.summary?.ready_queue_count || 0),
      candidate_file_count: candidateList.length,
      posting_plan_count: plans.length,
      queue_dry_run_count: queueRows.length,
      missing_file_count: missing_files.length,
      parse_error_count: parse_errors.length,
    },
    selected_candidate: selected,
    queues: {
      proof_queue_status: status?.summary?.proof_queue_status || queueProof.queue_status || null,
      proof_queue_count: Number(queueProof.queue_count || status?.proof?.queue_count || 0),
      latest_queue_id: queueProof.latest_queue_id || status?.proof?.latest_queue_id || null,
      dry_run_queue_count: queueRows.length,
    },
    classifications: {
      candidate_types: candidateList.reduce((acc, item) => {
        const key = item.type || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      posting_plan_types: plans.reduce((acc, item) => {
        const key = item?.plan?.type || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    },
    missing_files,
    parse_errors,
    blockers,
    next_action: blockers.length
      ? 'Önce eksik kanıt dosyalarını/workflow çıktılarını üret ve seçili adayın onay durumunu kanıtla.'
      : 'Kullanıcı açık onay verirse yalnızca tekil seçili aday için approve RPC dry/live akışı ayrı çalıştırılabilir.',
  };
}

const report = buildReport();
writeJson(out, report);

console.log('AperiON banka onay birleşik durum raporu');
console.log(`Safe mode: ${report.safe_mode}`);
console.log(`BizimHesap save çalıştı mı: ${report.live_bizimhesap_save_called}`);
console.log(`Eksik dosya: ${report.summary.missing_file_count}`);
console.log(`Seçili aday: ${report.selected_candidate ? `${report.selected_candidate.transaction_date} ${report.selected_candidate.bank_name} ${report.selected_candidate.amount} TL / ${report.selected_candidate.type}` : 'yok'}`);
console.log(`Safe to post: ${report.safe_to_post}`);
console.log(`Output: ${out}`);
