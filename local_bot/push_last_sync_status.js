const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const projectDir = process.env.APERION_PROJECT_DIR || 'C:\\Users\\HP\\Desktop\\ErpaltH';
const statusPath = path.join(projectDir, 'data', 'aperion_last_sync.json');
const logPath = path.join(projectDir, 'logs', 'push_last_sync_status.log');

function log(message) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  console.log(message);
}

function readStatus() {
  if (!fs.existsSync(statusPath)) {
    throw new Error(`Status dosyasi bulunamadi: ${statusPath}`);
  }
  return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  }

  const status = readStatus();
  const failed = (status.jobs || []).filter(job => job.status !== 'ok' && job.status !== 'skipped' && job.status !== 'planned');
  const okJobs = (status.jobs || []).filter(job => job.status === 'ok');
  const rowsPulled = okJobs.length;
  const finishedAt = status.finishedAt || new Date().toISOString();

  const payload = {
    bot_name: 'bizimhesap_klonu',
    company: status.firma || 'alayli',
    status: status.ok ? 'ok' : 'failed',
    started_at: status.startedAt || null,
    finished_at: finishedAt,
    last_success_at: status.ok ? finishedAt : null,
    rows_pulled: rowsPulled,
    message: status.ok ? 'BizimHesap klonu tamamlandi' : (status.issue || failed.map(j => `${j.file}:${j.status}`).join(', ')),
  };

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error } = await supabase.from('bot_sync_status').insert(payload);
  if (error) throw error;
  log(`OK - bot_sync_status yazildi: ${payload.company} ${payload.status} ${payload.finished_at}`);
}

main().catch(error => {
  log(`HATA - ${error.message || error}`);
  process.exitCode = 1;
});
