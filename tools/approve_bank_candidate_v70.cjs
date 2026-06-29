require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const ID = valueArg('--id', '');
const CONFIRM = valueArg('--confirm', '');
const DRY_CHECK = args.includes('--dry-check');
const candidateFile = valueArg('--candidates', 'data/banka_onay_guvenli_adaylar.json');
const outputFile = valueArg('--out', 'data/banka_onay_kuyruk_kaniti.json');
const REQUIRED_CONFIRM = 'ONAYLIYORUM';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';

function valueArg(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(body, null, 2), 'utf8');
}

function allCandidates(report) {
  return [
    report.recommended_first_approval,
    ...(Array.isArray(report.candidates) ? report.candidates : []),
  ].filter(Boolean);
}

function findCandidate(report, id) {
  return allCandidates(report).find(item => item.pending_bank_movement_id === id) || null;
}

function assertCandidateSafe(candidate) {
  if (!candidate) throw new Error('Aday bulunamadi. Once npm run bank:approval:candidates calistir.');
  if (candidate.risk_class !== 'low') throw new Error(`Aday dusuk riskli degil: ${candidate.risk_class}`);
  if (candidate.requires_user_review) throw new Error('Aday kullanici incelemesi istiyor; otomatik kuyruga alinmaz.');
  if (Number(candidate.confidence || 0) < 84) throw new Error(`Aday guveni dusuk: ${candidate.confidence}`);
  if (!/masraf|POS|virman|tahsilat/i.test(`${candidate.type} ${candidate.category}`)) {
    throw new Error(`Aday kayit turu beklenen grupta degil: ${candidate.type}`);
  }
}

async function fetchQueueProof(db, pendingId, queueId = null) {
  let query = db.from('bizimhesap_queue')
    .select('*')
    .eq('company_id', 'alayli')
    .eq('pending_bank_movement_id', pendingId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (queueId) query = query.eq('id', queueId);
  const { data, error } = await query;
  if (error) throw new Error(`Kuyruk kaniti okunamadi: ${error.message}`);
  return (data || [])[0] || null;
}

async function main() {
  const report = readJson(candidateFile);
  const candidate = ID ? findCandidate(report, ID) : report.recommended_first_approval;
  assertCandidateSafe(candidate);

  const proofBase = {
    created_at: new Date().toISOString(),
    safe_mode: true,
    live_rpc_called: false,
    candidate,
  };

  if (DRY_CHECK) {
    writeJson(outputFile, {
      ...proofBase,
      dry_check: true,
      message: 'Aday guvenli. RPC calistirilmadi.',
      required_live_command: `node tools/approve_bank_candidate_v70.cjs --id ${candidate.pending_bank_movement_id} --confirm ${REQUIRED_CONFIRM}`,
    });
    console.log('AperiON banka aday dry-check OK');
    console.log(`ID: ${candidate.pending_bank_movement_id}`);
    console.log(`${candidate.transaction_date} ${candidate.bank_name} ${candidate.amount} TL -> ${candidate.type} / ${candidate.counterparty} / guven ${candidate.confidence}%`);
    console.log('RPC calistirilmadi.');
    return;
  }

  if (!ID) throw new Error('--id zorunlu. Yanlis kaydi onlemeye kilit.');
  if (CONFIRM !== REQUIRED_CONFIRM) {
    throw new Error(`Canli kuyruk onayi icin --confirm ${REQUIRED_CONFIRM} gerekli. RPC calistirilmadi.`);
  }

  const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data: queueId, error } = await db.rpc('approve_pending_bank_movement', {
    p_id: ID,
    p_note: 'AperiON kullanici onayli guvenli aday',
  });
  if (error) throw new Error(`approve_pending_bank_movement hata: ${error.message}`);
  if (!queueId) throw new Error('RPC calisti ama queue id donmedi. Islem kanitsiz sayilir.');

  const queue = await fetchQueueProof(db, ID, queueId);
  const result = {
    ...proofBase,
    live_rpc_called: true,
    dry_check: false,
    queue_id: queueId,
    queue_status: queue?.status || null,
    queue,
  };
  writeJson(outputFile, result);
  console.log('AperiON banka adayi kuyruga alindi');
  console.log(`Pending ID: ${ID}`);
  console.log(`Queue ID: ${queueId}`);
  console.log(`Queue status: ${queue?.status || 'okunamadi'}`);
  console.log(`Output: ${outputFile}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
