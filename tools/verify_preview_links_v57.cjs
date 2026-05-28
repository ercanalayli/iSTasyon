const fs = require('fs');
const path = require('path');

const root = process.cwd();
const patchPath = path.join(root, 'tools', 'apply_preview_links_v57_patch.cjs');

function stop(msg) {
  console.error('FAIL ' + msg);
  process.exit(1);
}
function ok(msg) {
  console.log('OK ' + msg);
}
function read(file) {
  if (!fs.existsSync(file)) stop('missing file: ' + path.relative(root, file));
  ok('file exists: ' + path.relative(root, file));
  return fs.readFileSync(file, 'utf8');
}

const patch = read(patchPath);

[
  'nakit-komuta-v57.html',
  'gelen-ekstreler-v57.html',
  'Nakit Komuta v57',
  'Gelen Ekstreler',
  'kesin kayıt yok',
  'Gmail/Drive intake'
].forEach(token => {
  if (!patch.includes(token)) stop('missing token in patch: ' + token);
  ok('patch token: ' + token);
});

['nakit-komuta-v57.html', 'gelen-ekstreler-v57.html'].forEach(file => {
  if (!fs.existsSync(path.join(root, file))) stop('missing preview page: ' + file);
  ok('preview page: ' + file);
});

['BizimHesap kesin kayıt', 'otomatik kesin finans kaydı', 'make.com', 'n8n cloud'].forEach(token => {
  if (patch.toLowerCase().includes(token.toLowerCase())) stop('forbidden token found: ' + token);
});

console.log('');
console.log('OK v57 preview link verify successful.');
