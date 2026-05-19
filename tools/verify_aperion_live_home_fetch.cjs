const TARGET_URL = process.env.APERION_LIVE_URL || 'https://aperion-istasyon.pages.dev/';

async function main() {
  console.log('AperiON live HTTP verification');
  console.log('URL:', TARGET_URL);

  const response = await fetch(TARGET_URL, {
    headers: { 'cache-control': 'no-cache' }
  });

  console.log('HTTP status:', response.status);
  console.log('Final URL:', response.url);

  if (!response.ok) {
    throw new Error(`Live page HTTP error: ${response.status}`);
  }

  const html = await response.text();
  const checks = [
    ['AperiON identity', html.includes('AperiON')],
    ['iSTasyon identity', html.includes('iSTasyon')],
    ['Ana Ekran module', html.includes('Ana Ekran')],
    ['Satış Akışı menu', html.includes('Satış Akışı')],
    ['Cari Kartlar menu', html.includes('Cari Kartlar')],
    ['Banka / Moka menu', html.includes('Banka / Moka')],
    ['Finance cockpit iframe', html.includes('/finans-v54.html')]
  ];

  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? 'OK' : 'FAIL'} - ${name}`);
    if (!ok) failed += 1;
  }

  if (failed) {
    throw new Error(`${failed} live checks failed`);
  }

  console.log('RESULT: OK - AperiON live home is visible at root URL.');
}

main().catch(error => {
  console.error('RESULT: FAILED - AperiON live home check failed.');
  console.error(error.message || error);
  process.exitCode = 1;
});
