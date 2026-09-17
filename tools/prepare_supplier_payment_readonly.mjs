import { accountLookup, transferAccountEvidence, pageValue } from 'file:///C:/Users/HP/Documents/Codex/2026-08-27/referenced-chatgpt-conversation-this-is-an/work/aperion-command-bridge/src/windows-worker.js';
import { supplierPaymentReadOnlyDraft } from './lib/supplier_payment_readonly.mjs';

const [supplier, account, amount, date] = process.argv.slice(2);
const result = await supplierPaymentReadOnlyDraft({ supplier, account, amount, date }, pageValue, accountLookup, transferAccountEvidence);
console.log(JSON.stringify(result, null, 2));
