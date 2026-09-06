'use strict';

const path = require('node:path');
const canonicalRoot = process.env.APERION_CANONICAL_ROOT || 'C:\\AperiON\\iSTasyon';
require(path.join(canonicalRoot, 'node_modules', 'dotenv')).config({
  path: path.join(canonicalRoot, 'local-secrets', 'bizimhesap.local.env')
});
const { createClient } = require(path.join(canonicalRoot, 'node_modules', '@supabase', 'supabase-js'));

const url = process.argv[2] || 'https://bizimhesap.com/web/ngn/doc/ngnretailproposals';
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Yerel Supabase kasası eksik.');
  const { data, error } = await db.from('bot_commands').insert({
    command: 'bizimhesap_fetch',
    status: 'pending',
    params: { url, probe: 'diaper_proforma_form' }
  }).select('id').single();
  if (error || !data?.id) throw new Error(error?.message || 'Probe kuyruğa alınamadı.');
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const { data: row, error: readError } = await db.from('bot_commands').select('status,result').eq('id', data.id).single();
    if (readError) throw readError;
    if (row.status === 'completed') {
      try {
        const result = JSON.parse(row.result || '{}');
        console.log(JSON.stringify({ id: data.id, status: row.status, url: result.url, metin: result.metin, linkler: result.linkler, tablolar: result.tablolar }, null, 2));
      } catch (_error) {
        console.log(JSON.stringify({ id: data.id, status: row.status, truncated: true, raw: row.result || '' }, null, 2));
      }
      return;
    }
    if (row.status === 'failed') throw new Error(row.result || 'Probe başarısız.');
  }
  throw new Error(`Probe zaman aşımı: ${data.id}`);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
