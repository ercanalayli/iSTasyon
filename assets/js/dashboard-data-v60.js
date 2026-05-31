/* AperiON v60 Central Dashboard Data Adapter
   Single data layer for dashboard-v60.html and detail-v60.html.
   Uses demo fallback until Supabase views/RPC are wired.
   Display-only: no live data mutation.
*/
(function () {
  const DEMO_SUMMARY = {
    today: { sales: 245350, expenses: 32900, purchases: 78600, profit: 58100, profitEstimated: 64200 },
    yesterday: { sales: 198200, expenses: 27500, purchases: 62400, profit: 48600, profitEstimated: 51100 },
    this_week: { sales: 1248750, expenses: 218400, purchases: 402700, profit: 286500, profitEstimated: 312900 },
    this_month: { sales: 4824500, expenses: 914000, purchases: 1568000, profit: 1104500, profitEstimated: 1220000 },
    last_month: { sales: 4390000, expenses: 1005000, purchases: 1480000, profit: 982000, profitEstimated: 1050000 },
    this_year: { sales: 28450000, expenses: 6175000, purchases: 9520000, profit: 6520000, profitEstimated: 7180000 },
    last_year: { sales: 22100000, expenses: 5840000, purchases: 8100000, profit: 4680000, profitEstimated: 5020000 },
    custom: { sales: 0, expenses: 0, purchases: 0, profit: 0, profitEstimated: 0 }
  };

  const DEMO_DRILLDOWN = {
    sales: ['Hasta Bezi', 'Kulak İşitme', 'Tekerlekli Sandalye', 'Sarf Malzeme'],
    expenses: ['Kargo', 'Personel', 'Kira', 'Banka Masrafı'],
    purchases: ['Jender', 'Siemens', 'Medikal Sarf', 'Ortopedi'],
    profit: ['Hasta Bezi', 'Kulak İşitme', 'Havalı Yatak', 'Eksik Maliyetli Ürün']
  };

  function getSupabaseClient() {
    return window.supabaseClient || window.aperionSupabase || window.db || null;
  }

  function periodPayload(period) {
    const p = period || (window.AperionDashboardState ? window.AperionDashboardState.getPeriod() : { id: 'today' });
    return {
      period: p.id || p.period || 'today',
      start_date: p.start || p.startDate || null,
      end_date: p.end || p.endDate || null,
      company: 'alayli'
    };
  }

  async function getSummary(period) {
    const payload = periodPayload(period);
    const client = getSupabaseClient();

    if (client && typeof client.rpc === 'function') {
      try {
        const result = await client.rpc('aperion_dashboard_summary_v60', payload);
        if (!result.error && result.data) return Array.isArray(result.data) ? result.data[0] : result.data;
      } catch (_) {
        // fallback below
      }
    }

    return DEMO_SUMMARY[payload.period] || DEMO_SUMMARY.today;
  }

  async function getDrilldown(moduleName, tabName, period) {
    const payload = Object.assign(periodPayload(period), {
      module_name: moduleName || 'sales',
      tab_name: tabName || 'Kategori'
    });
    const client = getSupabaseClient();

    if (client && typeof client.rpc === 'function') {
      try {
        const result = await client.rpc('aperion_dashboard_drilldown_v60', payload);
        if (!result.error && Array.isArray(result.data)) return result.data;
      } catch (_) {
        // fallback below
      }
    }

    const seed = DEMO_DRILLDOWN[payload.module_name] || DEMO_DRILLDOWN.sales;
    return seed.map((name, index) => ({
      label: name,
      subtitle: `${payload.tab_name} · ${payload.period}`,
      amount: (index + 1) * 34500,
      count: (index + 1) * 3,
      currency: 'TRY'
    }));
  }

  window.AperionDashboardData = {
    getSummary,
    getDrilldown,
    periodPayload
  };
})();
