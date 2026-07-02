const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const out = valueArg('--out', 'data/aperion_bank_approval_status.json');

function valueArg(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(body, null, 2), 'utf8');
}

function money(amount) {
  const n = Number(amount || 0);
  const sign = n < 0 ? '-' : '';
  return `${sign}TL ${Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildStatus() {
  const candidates = readJson('data/banka_onay_guvenli_adaylar.json', {});
  const dry = readJson('data/banka_onay_kuyruk_kaniti.json', {});
  const proof = readJson('data/banka_onay_aday_kanit_durumu.json', {});
  const queueDry = readJson('data/bizimhesap_queue_dryrun.json', {});
  const candidate = dry.candidate || proof.selected_candidate || candidates.recommended_first_approval || null;
  const readyQueue = Number(queueDry?.summary?.queue_count || queueDry?.queue_count || 0);
  const queueStatus = proof.queue_status || (readyQueue > 0 ? 'ready_queue_var' : 'queue_yok');
  const liveCommand = candidate
    ? `node tools/approve_bank_candidate_v70.cjs --id ${candidate.pending_bank_movement_id} --confirm ONAYLIYORUM`
    : '';

  const blockers = [];
  if (!candidate) blockers.push('Guncel guvenli aday bulunamadi.');
  if (candidate && candidate.risk_class !== 'low') blockers.push(`Aday dusuk riskli degil: ${candidate.risk_class}`);
  if (candidate && Number(candidate.confidence || 0) < 84) blockers.push(`Aday guveni dusuk: ${candidate.confidence}`);
  if (candidate && candidate.requires_user_review) blockers.push('Aday kullanici incelemesi istiyor.');
  if (candidate && proof.pending_found === false) blockers.push('Pending kayit Supabase icinde bulunamadi.');

  const nextAction = readyQueue > 0
    ? 'BizimHesap worker dry-run ile hazir kuyruk planini kontrol et; canli save icin ayrica kullanici onayi gerekir.'
    : blockers.length
      ? 'Blokajlari duzelt; bu aday kuyruga alinmaz.'
      : 'Kullanici bu tekil kaydi onaylarsa Supabase approve RPC calisir ve kayit BizimHesap queue icine alinir.';

  return {
    created_at: new Date().toISOString(),
    safe_mode: true,
    live_rpc_called: false,
    live_bizimhesap_save_called: false,
    company_id: candidates.company_id || proof.company_id || 'alayli',
    summary: {
      preview_count: Number(candidates?.summary?.preview_count || 0),
      candidate_count: Number(candidates?.summary?.candidate_count || 0),
      low_risk_count: Number(candidates?.summary?.low_risk_count || 0),
      review_count: Number(candidates?.summary?.review_count || 0),
      ready_queue_count: readyQueue,
      proof_queue_status: queueStatus,
      pending_status: proof.pending_status || null,
    },
    selected_candidate: candidate ? {
      pending_bank_movement_id: candidate.pending_bank_movement_id,
      bank_name: candidate.bank_name,
      transaction_date: candidate.transaction_date,
      transaction_time: candidate.transaction_time || '',
      amount: Number(candidate.amount || 0),
      amount_label: money(candidate.amount),
      target: candidate.target,
      type: candidate.type,
      account: candidate.account,
      counterparty: candidate.counterparty,
      category: candidate.category,
      confidence: Number(candidate.confidence || 0),
      risk_class: candidate.risk_class,
      requires_user_review: !!candidate.requires_user_review,
      reasons: candidate.reasons || [],
    } : null,
    proof: {
      pending_found: !!proof.pending_found,
      pending_status: proof.pending_status || null,
      queue_count: Number(proof.queue_count || 0),
      queue_status: queueStatus,
      latest_queue_id: proof.latest_queue_id || null,
    },
    blockers,
    next_action: nextAction,
    required_user_approval_text: candidate ? `Bu tek kaydi kuyruga almayi onayliyorum: ${candidate.pending_bank_movement_id}` : '',
    required_live_command_after_user_approval: liveCommand,
    files: {
      candidates: 'data/banka_onay_guvenli_adaylar.json',
      dry_check: 'data/banka_onay_kuyruk_kaniti.json',
      queue_proof: 'data/banka_onay_aday_kanit_durumu.json',
      queue_worker_dry_run: 'data/bizimhesap_queue_dryrun.json',
    },
  };
}

const status = buildStatus();
writeJson(out, status);

console.log('AperiON banka onay durumu');
console.log(`Aday: ${status.selected_candidate ? `${status.selected_candidate.transaction_date} ${status.selected_candidate.bank_name} ${status.selected_candidate.amount_label}` : 'yok'}`);
console.log(`ID: ${status.selected_candidate?.pending_bank_movement_id || '-'}`);
console.log(`Karar: ${status.selected_candidate ? `${status.selected_candidate.type} / ${status.selected_candidate.counterparty} / guven ${status.selected_candidate.confidence}%` : '-'}`);
console.log(`Kuyruk: ${status.summary.ready_queue_count} hazir, kanit ${status.proof.queue_status}`);
console.log(`Sonraki adim: ${status.next_action}`);
console.log(`Output: ${out}`);
