const DEFAULT_LIVE_URLS = [
  'https://aperion-istasyon.pages.dev/',
  'https://ercanalayli.github.io/iSTasyon/'
];

function liveUrlCandidates() {
  const raw = process.env.APERION_LIVE_URLS || process.env.APERION_LIVE_URL || '';
  const urls = raw
    ? raw.split(',').map(x => x.trim()).filter(Boolean)
    : DEFAULT_LIVE_URLS;
  return [...new Set(urls)];
}

async function fetchFirstLiveUrl() {
  let lastError = null;
  for (const url of liveUrlCandidates()) {
    try {
      const response = await fetch(url, {
        headers: { 'cache-control': 'no-cache' }
      });
      if (!response.ok) {
        throw new Error(`Live page HTTP error: ${response.status}`);
      }
      return { url, response };
    } catch (error) {
      lastError = error;
      console.log(`WARN - Live URL unavailable: ${url} - ${error.message || error}`);
    }
  }
  throw lastError || new Error('No live URL candidates configured.');
}

function includesAny(html, terms) {
  return terms.some(term => html.includes(term));
}

async function main() {
  console.log('AperiON live HTTP verification');
  console.log('URL candidates:', liveUrlCandidates().join(', '));

  const { url, response } = await fetchFirstLiveUrl();

  console.log('Selected URL:', url);
  console.log('HTTP status:', response.status);
  console.log('Final URL:', response.url);

  const html = await response.text();
  const checks = [
    ['AperiON identity', html.includes('AperiON')],
    ['iSTasyon identity', html.includes('iSTasyon')],
    ['Command center module', includesAny(html, ['Komuta Merkezi', 'Ust Akil Paneli', 'Üst Akıl Paneli'])],
    ['Satis Akisi menu', includesAny(html, ['Satis Akisi', 'Satış Akışı', 'SatÄ±ÅŸ AkÄ±ÅŸÄ±'])],
    ['Cari Kartlar menu', html.includes('Cari Kartlar')],
    ['Banka Canli menu', includesAny(html, ['Banka Canli', 'Banka Canlı', 'Banka / Moka'])],
    ['Gelir Tablosu menu', html.includes('Gelir Tablosu')],
    ['Bank approval posting path', html.includes('bank-approval-path') && html.includes('bank-posting-flow')]
  ];

  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? 'OK' : 'FAIL'} - ${name}`);
    if (!ok) failed += 1;
  }

  if (failed) {
    throw new Error(`${failed} live checks failed`);
  }

  console.log('RESULT: OK - AperiON live home is visible at a verified live URL.');
}

main().catch(error => {
  console.error('RESULT: FAILED - AperiON live home check failed.');
  console.error(error.message || error);
  process.exitCode = 1;
});
