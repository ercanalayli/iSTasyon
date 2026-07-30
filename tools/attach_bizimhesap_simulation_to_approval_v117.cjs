if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
const fs = require('fs');
const path = require('path');

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function attachSimulation(unified = {}, simulation = {}) {
  const rows = Array.isArray(simulation.simulations) ? simulation.simulations : [];
  const selectedId = unified.selected_candidate?.pending_bank_movement_id || '';
  const selected = rows.find(row => row.pending_bank_movement_id === selectedId) || null;
  const summary = simulation.summary || {};

  return {
    ...unified,
    safe_to_post: false,
    approval_center_simulation: {
      source: simulation.source || 'bizimhesap_queue_worker dry-run',
      created_at: simulation.created_at || null,
      writes_to_bizimhesap: false,
      live_save_allowed: false,
      queue_count: Number(summary.queue_count || rows.length),
      ready_for_user_approval: Number(summary.ready_for_user_approval || 0),
      blocked: Number(summary.blocked || 0),
      selected,
      simulations: rows,
    },
    policy: 'Onay Merkezi salt okunur simÃ¼lasyon gÃ¶sterir. AÃ§Ä±k kullanÄ±cÄ± onayÄ±, canlÄ± kilit ve kayÄ±t sonrasÄ± geri doÄŸrulama olmadan BizimHesap kaydÄ± yapÄ±lamaz.',
  };
}

if (require.main === module) {
  const unifiedFile = process.argv[2] || 'data/aperion_bank_approval_unified_status.json';
  const simulationFile = process.argv[3] || 'data/bizimhesap_simulation.json';
  const outputFile = process.argv[4] || unifiedFile;
  const unified = readJson(unifiedFile);
  if (!unified) throw new Error(`BirleÅŸik Onay Merkezi durumu bulunamadÄ±: ${unifiedFile}`);
  const simulation = readJson(simulationFile) || { simulations: [], summary: {} };
  const result = attachSimulation(unified, simulation);
  writeJson(outputFile, result);
  console.log(`Onay Merkezi simÃ¼lasyonu: ${result.approval_center_simulation.queue_count} kayÄ±t, canlÄ± yazma: 0`);
}

module.exports = { attachSimulation };

