/* AperiON v60 Dashboard Period State Helper
   - Keeps selected period in URL + localStorage.
   - Does not mutate live financial data.
*/
(function () {
  const STORAGE_KEY = 'aperion_global_period_v60';

  const PERIODS = [
    { id: 'today', label: 'Bugün' },
    { id: 'yesterday', label: 'Dün' },
    { id: 'this_week', label: 'Bu Hafta' },
    { id: 'this_month', label: 'Bu Ay' },
    { id: 'last_month', label: 'Geçen Ay' },
    { id: 'this_year', label: 'Bu Yıl' },
    { id: 'last_year', label: 'Geçen Yıl' },
    { id: 'custom', label: 'Özel Aralık' },
  ];

  function getParams() {
    return new URLSearchParams(window.location.search || '');
  }

  function getFromUrl() {
    const p = getParams();
    const period = p.get('period');
    const start = p.get('start');
    const end = p.get('end');
    if (!period) return null;
    return { id: period, start, end };
  }

  function getStored() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function setStored(period) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(period));
  }

  function normalize(period) {
    const id = period && period.id ? period.id : 'today';
    const valid = PERIODS.some(p => p.id === id) ? id : 'today';
    return {
      id: valid,
      period: valid,
      label: PERIODS.find(p => p.id === valid).label,
      start: period && period.start ? period.start : null,
      end: period && period.end ? period.end : null,
      startDate: period && period.start ? period.start : null,
      endDate: period && period.end ? period.end : null,
    };
  }

  function getPeriod() {
    return normalize(getFromUrl() || getStored() || { id: 'today' });
  }

  function setPeriod(input, options = {}) {
    const period = normalize(typeof input === 'string' ? { id: input } : input);
    setStored(period);

    if (options.updateUrl !== false) {
      const url = new URL(window.location.href);
      url.searchParams.set('period', period.id);
      if (period.id === 'custom') {
        if (period.start) url.searchParams.set('start', period.start);
        if (period.end) url.searchParams.set('end', period.end);
      } else {
        url.searchParams.delete('start');
        url.searchParams.delete('end');
      }
      window.history.replaceState({}, '', url.toString());
    }

    window.dispatchEvent(new CustomEvent('aperion:period-change', { detail: period }));
    return period;
  }

  function setCustomPeriod(start, end, options = {}) {
    return setPeriod({ id: 'custom', start, end }, options);
  }

  function cleanModuleName(moduleName) {
    return String(moduleName || '')
      .replace(/^\//, '')
      .replace(/\.html$/i, '')
      .replace(/-detail-v60$/i, '');
  }

  function buildDetailUrl(moduleName) {
    const module = cleanModuleName(moduleName);
    const period = getPeriod();
    const url = new URL(`${module}-detail-v60.html`, window.location.href);
    url.searchParams.set('period', period.id);
    if (period.id === 'custom') {
      if (period.start) url.searchParams.set('start', period.start);
      if (period.end) url.searchParams.set('end', period.end);
    }
    return url.toString();
  }

  window.AperionDashboardState = {
    periods: PERIODS,
    getPeriod,
    setPeriod,
    setCustomPeriod,
    buildDetailUrl,
  };
})();
