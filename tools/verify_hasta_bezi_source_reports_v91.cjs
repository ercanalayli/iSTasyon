#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicAudit = path.join(root, 'hasta-bezi', 'fifo_chunks', 'source_audit.json');
if (!fs.existsSync(publicAudit)) {
  console.error('RESULT: FAILED - run npm run hasta-bezi:source-audit first.');
  process.exit(1);
}
const audit = JSON.parse(fs.readFileSync(publicAudit, 'utf8'));
const sales = audit.reports && audit.reports.sales;
const purchases = audit.reports && audit.reports.purchases;
const fifo = audit.fifo_package_check;
const errors = [];
if (!sales || !sales.date_range.from || sales.date_range.from > '2025-01-01' || !sales.date_range.to) errors.push('sales date range is incomplete');
if (!purchases || !purchases.date_range.from || purchases.date_range.from > '2025-01-31' || !purchases.date_range.to) errors.push('purchase date range is incomplete');
if (!sales || sales.accepted_row_count < 1) errors.push('sales rows are missing');
if (!purchases || purchases.accepted_row_count < 1) errors.push('purchase rows are missing');
if (!fifo || !fifo.sales_line_match || !fifo.movement_line_match) errors.push('current FIFO package does not match report line counts');
if (errors.length) {
  console.error(`RESULT: FAILED - ${errors.join('; ')}`);
  process.exit(1);
}
console.log(`RESULT: OK - ${sales.accepted_row_count} sales and ${purchases.accepted_row_count} purchase lines cover ${sales.date_range.from} through ${sales.date_range.to}; FIFO package line counts match.`);
