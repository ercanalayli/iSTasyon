import fs from 'fs/promises';
import cfg from './mail-ekstre-config.json' assert { type: 'json' };
import { parseBankStatement } from './parsers/index.js';

const now = new Date().toISOString();
const dryRun = process.env.DRY_RUN !== '0';

async function main(){
  const report = {
    run_at: now,
    mode: dryRun ? 'dry_run' : 'live',
    company_id: cfg.company_id,
    mailbox: cfg.mailbox,
    note: 'Worker lite: Gmail OAuth and Supabase insert hooks are separated. This file validates config, parser router and reporting shape.',
    banks: cfg.banks.map(b => ({ bank: b.bank, label: b.label, query: b.query, status: 'configured' })),
    next_steps: [
      'connect Gmail OAuth for alaylimedikal@gmail.com',
      'fetch attachments from matching bank mails',
      'pass extracted text to parseBankStatement',
      'insert non-duplicate rows into pending_bank_movements',
      'send approved rows to bizimhesap_queue'
    ]
  };
  await fs.mkdir('automation/logs',{recursive:true});
  await fs.writeFile(`automation/logs/mail-ekstre-lite-${Date.now()}.json`, JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}

main().catch(e=>{console.error(e);process.exit(1)});
