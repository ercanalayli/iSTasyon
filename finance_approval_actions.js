/*
AperiON / ErpaltH iSTasyon
Finans Onay Merkezi Aksiyonları

Bu dosya Onay Merkezi butonlarının gerçek iş akışını tanımlar.
Kesin kayıt mantığı:
- Onayla: approval_status = onaylandi, status = bekliyor
- Reddet: approval_status = reddedildi, status = iptal
- Hiçbir kayıt kullanıcı onayı olmadan kesinleşmez.
*/

async function handleFinanceApprove({ supabaseClient, adapter, recordId, approvedBy = 'user', refresh }) {
  if (!adapter || typeof adapter.approveFinanceRecord !== 'function') {
    throw new Error('Finance adapter eksik: approveFinanceRecord bulunamadı.');
  }
  const result = await adapter.approveFinanceRecord(supabaseClient, recordId, approvedBy);
  if (typeof refresh === 'function') await refresh();
  return result;
}

async function handleFinanceReject({ supabaseClient, adapter, recordId, reason = '', refresh }) {
  if (!adapter || typeof adapter.rejectFinanceRecord !== 'function') {
    throw new Error('Finance adapter eksik: rejectFinanceRecord bulunamadı.');
  }
  const result = await adapter.rejectFinanceRecord(supabaseClient, recordId, reason);
  if (typeof refresh === 'function') await refresh();
  return result;
}

function renderApprovalActionButtons(record) {
  const safeId = String(record.id || record.temp_id || '').replace(/'/g, '');
  return `
    <button class="btn ok" onclick="window.aperionFinanceApprove && window.aperionFinanceApprove('${safeId}')">Onayla</button>
    <button class="btn danger" onclick="window.aperionFinanceReject && window.aperionFinanceReject('${safeId}')">Reddet</button>
  `;
}

function installApprovalActions({ supabaseClient, adapter, refresh, currentUser = 'user' }) {
  window.aperionFinanceApprove = async function(recordId) {
    try {
      await handleFinanceApprove({ supabaseClient, adapter, recordId, approvedBy: currentUser, refresh });
      alert('Kayıt onaylandı.');
    } catch (err) {
      console.error(err);
      alert('Onay sırasında hata oluştu: ' + (err.message || err));
    }
  };
  window.aperionFinanceReject = async function(recordId) {
    const reason = prompt('Red sebebi yaz:', 'Kontrol sonrası reddedildi') || '';
    try {
      await handleFinanceReject({ supabaseClient, adapter, recordId, reason, refresh });
      alert('Kayıt reddedildi.');
    } catch (err) {
      console.error(err);
      alert('Red sırasında hata oluştu: ' + (err.message || err));
    }
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    handleFinanceApprove,
    handleFinanceReject,
    renderApprovalActionButtons,
    installApprovalActions
  };
}
