const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd){
  console.log('\n$ ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

function hasGitChanges(){
  try{
    const out = execSync('git status --porcelain', { encoding: 'utf8' });
    return out.trim().length > 0;
  }catch(e){
    return false;
  }
}

const root = path.resolve(__dirname, '..');
process.chdir(root);

console.log('AperiON v46 apply + verify + commit');
console.log('-----------------------------------');

run('npm run patch:sales-today-finance-calendar');
run('npm run verify:sales-today-finance-calendar');

if(!hasGitChanges()){
  console.log('\nNo file changes detected. Patch may already be applied.');
  process.exit(0);
}

const changed = execSync('git status --short', { encoding: 'utf8' });
console.log('\nChanged files:\n' + changed);

run('git add index.html index.backup-before-sales-today-finance-calendar-v46.html package.json tools/apply_sales_today_finance_calendar_patch_v46.js tools/verify_sales_today_finance_calendar_v46.js tools/apply_commit_sales_today_finance_calendar_v46.cjs');
run('git commit -m "Integrate sales today filter and finance calendar v46"');

console.log('\nRESULT: OK - committed locally. Push with: git push');
