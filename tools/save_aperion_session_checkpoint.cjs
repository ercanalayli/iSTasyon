const fs = require('fs');
const path = require('path');

const ENDPOINT = process.env.APERION_SESSION_CHECKPOINT_URL || 'https://aperion-istasyon.pages.dev/api/session-checkpoint';
const SECRET = process.env.APERION_BRIDGE_SECRET || '';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

async function main() {
  const inputPath = argument('--file');
  if (!inputPath) throw new Error('--file <checkpoint.json> gerekli.');
  if (!SECRET || SECRET.length < 32) throw new Error('APERION_BRIDGE_SECRET gerekli.');
  const absoluteInput = path.resolve(inputPath);
  const payload = JSON.parse(fs.readFileSync(absoluteInput, 'utf8'));
  const localDirectory = path.resolve('artifacts', 'session-checkpoints');
  fs.mkdirSync(localDirectory, { recursive: true });
  const safeKey = String(payload.checkpoint_key || 'checkpoint').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 160);
  fs.writeFileSync(path.join(localDirectory, `${safeKey}.json`), JSON.stringify(payload, null, 2), 'utf8');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(`Checkpoint API başarısız (HTTP ${response.status}): ${body.error || 'bilinmeyen hata'}`);
  console.log(JSON.stringify({ ok: true, duplicate: body.duplicate, checkpoint_key: body.checkpoint_key || payload.checkpoint_key, checkpoint_id: body.checkpoint_id }));
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
