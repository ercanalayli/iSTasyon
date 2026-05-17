/* AperiON Risk Formatter v49
   Purpose: format aperion_risk_feed_v49_view and aperion_risk_summary_v49_view rows for Telegram/UI.
   Safe rule: formatting only. No database write.
*/

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function riskIcon(level){
  return { critical:'🚨', high:'🟠', warning:'🟡', ok:'🟢' }[level] || '•';
}

function riskTR(level){
  return { critical:'Kritik', high:'Yüksek', warning:'Uyarı', ok:'Normal' }[level] || level || '-';
}

function formatRiskRows(rows, title = 'AperiON Riskler'){
  if(!rows || rows.length === 0) return `<b>${title}</b>\nRisk görünmüyor.`;
  const lines = rows.slice(0, 20).map((r, i) => {
    const amount = Number(r.amount || 0) ? ` — <b>${money(r.amount)}</b>` : '';
    const ref = r.ref_name ? `\n   Ref: ${r.ref_name}` : '';
    return `${i + 1}. ${riskIcon(r.risk_level)} <b>${riskTR(r.risk_level)} / ${r.title || '-'}</b>${amount}\n   ${r.message || '-'}${ref}`;
  });
  const more = rows.length > 20 ? `\n\n+${rows.length - 20} risk daha var.` : '';
  return `<b>${title}</b>\n` + lines.join('\n') + more;
}

function formatRiskSummary(summary = {}, rows = []){
  const header = `<b>AperiON Risk Özeti</b>\n` +
    `Toplam: <b>${summary.total_risk_count || 0}</b> · ` +
    `Kritik: <b>${summary.critical_count || 0}</b> · ` +
    `Yüksek: <b>${summary.high_count || 0}</b> · ` +
    `Uyarı: <b>${summary.warning_count || 0}</b>\n` +
    `Finansal risk tutarı: <b>${money(summary.financial_risk_amount)}</b>\n\n`;
  return header + formatRiskRows(rows, 'Risk Listesi');
}

module.exports = { money, riskIcon, riskTR, formatRiskRows, formatRiskSummary };
