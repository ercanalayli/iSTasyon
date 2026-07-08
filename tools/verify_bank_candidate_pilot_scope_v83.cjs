const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tmpDir = 'tmp/aperion_bank_candidate_pilot_scope_v83';
const input = path.join(tmpDir, 'posting_plan.json');
const output = path.join(tmpDir, 'selected_candidates.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function plan({ id, bank, type, amountIn = 0, amountOut = 0, confidence = 90 }) {
  return {
    pending_bank_movement_id: id,
    bank_name: bank,
    transaction_date: '2026-07-05',
    transaction_time: '',
    amount_in: amountIn,
    amount_out: amountOut,
    balance_after: 0,
    description: type,
    plan: {
      kind: /POS/.test(type) ? 'pos_bank_transfer' : 'tax_or_sgk_payment',
      type,
      target: /POS/.test(type) ? 'BizimHesap hesaplar arasi transfer' : 'BizimHesap gider/odeme kaydi',
      account: `${bank} banka hesabi`,
      source_account: /POS/.test(type) ? 'POS POS POS KREDI KARTI' : `${bank} banka hesabi`,
      target_account: /POS/.test(type) ? `${bank} banka hesabi` : 'Vergi/SGK',
      counterparty: /POS/.test(type) ? `POS POS POS KREDI KARTI -> ${bank} banka hesabi` : 'Vergi/SGK',
      category: /POS/.test(type) ? 'POS banka aktarimi' : 'Vergi/SGK',
      confidence,
      amount: amountIn > 0 ? amountIn : Math.abs(amountOut),
      date: '2026-07-05',
      time: '',
      bank_name: bank,
      description: type,
      reasons: /POS/.test(type) ? ['banka alacak/giris', 'POS banka aktarimi'] : ['banka borc/cikis', 'vergi/sgk'],
      requires_user_review: false,
      next_step_after_user_approval: 'approve_pending_bank_movement RPC -> bizimhesap_queue.status=ready_for_bizimhesap',
    },
  };
}

function main() {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const report = {
    created_at: new Date().toISOString(),
    company_id: 'alayli',
    dry_run: true,
    plans: [
      plan({ id: 'yk-small-tax', bank: 'Yapi Kredi', type: 'Vergi/SGK odemesi', amountOut: 3.56, confidence: 99 }),
      plan({ id: 'is-pos-transfer', bank: 'Turkiye Is Bankasi', type: 'POS banka transferi', amountIn: 2026, confidence: 88 }),
      plan({ id: 'vakif-pos-transfer', bank: 'VakifBank', type: 'POS banka transferi', amountIn: 1500, confidence: 96 }),
    ],
  };
  fs.writeFileSync(input, JSON.stringify(report, null, 2), 'utf8');

  execSync(`BANK_APPROVAL_PILOT_BANK="IS BANKASI" node tools/select_bank_approval_candidate_v69.cjs --input ${input} --out ${output}`, { stdio: 'pipe' });
  const selected = JSON.parse(fs.readFileSync(output, 'utf8'));
  const first = selected.recommended_first_approval;

  assert(selected.pilot_scope_applied === true, 'Pilot banka filtresi uygulanmali');
  assert(selected.summary.pilot_candidate_count === 1, 'Testte tam 1 Is Bankasi pilot adayi bekleniyor');
  assert(first, 'Onerilen ilk aday yok');
  assert(first.pending_bank_movement_id === 'is-pos-transfer', 'Ilk aday pilot Is Bankasi kaydi olmali');
  assert(first.type === 'POS banka transferi', 'Pilot POS kaydi transfer olarak kalmali');
  assert(first.source_account === 'POS POS POS KREDI KARTI', 'Pilot POS kaynak hesabi korunmali');
  assert(first.target.includes('hesaplar arasi transfer'), 'Pilot POS hedefi hesaplar arasi transfer olmali');

  console.log('OK bank candidate pilot scope');
}

main();
