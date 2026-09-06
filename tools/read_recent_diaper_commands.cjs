'use strict';

const path = require('node:path');
const canonicalRoot = process.env.APERION_CANONICAL_ROOT || 'C:\\AperiON\\iSTasyon';
require(path.join(canonicalRoot, 'node_modules', 'dotenv')).config({ path: path.join(canonicalRoot, 'local-secrets', 'bizimhesap.local.env') });
const { createClient } = require(path.join(canonicalRoot, 'node_modules', '@supabase', 'supabase-js'));

async function run() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Yerel Supabase kasası eksik.');
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await db.from('bot_commands').select('id,command,status,params,created_at,result').order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  const matches = (data || []).filter(row => /hasta bezi|balya|diaper|ak[ıi]n medikal|sercan medikal/i.test(JSON.stringify(row.params || {})));
  console.log(JSON.stringify(matches, null, 2));
}

run().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
