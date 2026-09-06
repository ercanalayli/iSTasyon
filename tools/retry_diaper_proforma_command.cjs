'use strict';

const path = require('node:path');
const canonicalRoot = process.env.APERION_CANONICAL_ROOT || 'C:\\AperiON\\iSTasyon';
require(path.join(canonicalRoot, 'node_modules', 'dotenv')).config({
  path: path.join(canonicalRoot, 'local-secrets', 'bizimhesap.local.env')
});
const { createClient } = require(path.join(canonicalRoot, 'node_modules', '@supabase', 'supabase-js'));

const commandId = Number(process.argv[2]);
if (!Number.isInteger(commandId) || commandId <= 0) throw new Error('Geçerli bot_commands kimliği gerekli.');
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Yerel Supabase kasası eksik.');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  const { data: current, error: readError } = await db.from('bot_commands')
    .select('id,command,status,params').eq('id', commandId).single();
  if (readError) throw readError;
  if (current.command !== 'bizimhesap_diaper_proforma') throw new Error(`Komut türü uygun değil: ${current.command}`);
  if (current.status !== 'failed') throw new Error(`Yalnız başarısız komut yeniden denenebilir: ${current.status}`);
  const { data, error } = await db.from('bot_commands').update({
    status: 'pending', result: null, started_at: null, completed_at: null
  }).eq('id', commandId).eq('status', 'failed').select('id,status').single();
  if (error) throw error;
  console.log(JSON.stringify(data));
})().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
