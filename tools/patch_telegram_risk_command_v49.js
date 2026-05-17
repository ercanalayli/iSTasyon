const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const botPath = path.join(root, 'telegram', 'aperion_telegram_bot_v47.js');
const backupPath = path.join(root, 'telegram', 'aperion_telegram_bot_v47.backup-before-risk-v49.js');

let src = fs.readFileSync(botPath, 'utf8');
if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, src, 'utf8');
let changed = false;

function replaceOnce(search, replace, label){
  if(src.includes(replace)){
    console.log('SKIP already applied: ' + label);
    return;
  }
  if(!src.includes(search)){
    console.log('SKIP target not found: ' + label);
    return;
  }
  src = src.replace(search, replace);
  changed = true;
  console.log('OK ' + label);
}

// 1) import formatter after env constants or top area
if(!src.includes("aperion_risk_formatter_v49.js")){
  src = src.replace(
    "const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;",
    "const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;\nconst { formatRiskSummary } = require('./aperion_risk_formatter_v49.js');"
  );
  changed = true;
  console.log('OK risk formatter import');
}

// 2) add risk helpers after getSummary function
const helperSearch = "async function getSummary(company = 'ALAYLI'){\n  const rows = await supabaseSelect('finance_calendar_summary_view', { company: `eq.${company}`, limit: '1' });\n  return rows[0] || {};\n}";
const helperReplace = helperSearch + `

async function getRiskSummary(company = 'ALAYLI'){
  const rows = await supabaseSelect('aperion_risk_summary_v49_view', { company: \`eq.\${company}\`, limit: '1' });
  return rows[0] || {};
}

async function getRiskRows(company = 'ALAYLI'){
  return supabaseSelect('aperion_risk_feed_v49_view', {
    company: \`eq.\${company}\`,
    order: 'risk_level.asc,amount.desc',
    limit: '50'
  });
}

async function commandRisk(chatId, company = 'ALAYLI'){
  const [summary, rows] = await Promise.all([getRiskSummary(company), getRiskRows(company)]);
  await telegramSend(chatId, formatRiskSummary(summary, rows));
}`;
replaceOnce(helperSearch, helperReplace, 'risk helpers and command');

// 3) add /risk to start/help text
src = src.replace(/Komutlar: \/bugun \/nakit \/odenecekler \/tahsilatlar \/gecikenler \/yapilacak \/onay \/rapor/g,
  'Komutlar: /bugun /nakit /risk /odenecekler /tahsilatlar /gecikenler /yapilacak /onay /rapor');
if(src.includes('/risk /odenecekler')) changed = true;

// 4) add command route before odenecekler
replaceOnce(
  "  if(cmd === '/nakit' || cmd === '/rapor') return commandNakit(chatId);\n  if(cmd === '/odenecekler' || cmd === '/odenecek') return commandOdenecekler(chatId);",
  "  if(cmd === '/nakit' || cmd === '/rapor') return commandNakit(chatId);\n  if(cmd === '/risk' || cmd === '/riskler') return commandRisk(chatId);\n  if(cmd === '/odenecekler' || cmd === '/odenecek') return commandOdenecekler(chatId);",
  'risk command route'
);

// 5) export commandRisk if module.exports contains commandRapor
replaceOnce(
  "  commandOnay,\n  commandRapor,\n  formatCalendarRows",
  "  commandOnay,\n  commandRapor,\n  commandRisk,\n  formatCalendarRows",
  'risk export'
);

if(changed){
  fs.writeFileSync(botPath, src, 'utf8');
  console.log('RESULT: OK - Telegram /risk command v49 patch applied. Backup: ' + backupPath);
}else{
  console.log('RESULT: NO CHANGE - patch may already be applied or base file pattern differs.');
}
