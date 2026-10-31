'use strict';
const assert = require('node:assert/strict');
const { probeFarmazonSession, allowedFarmazonPage } =
  require('./lib/farmazon_readonly_health.cjs');
const agent = require('./lib/desktop_agent_v1.cjs');

async function main() {
  let tests = 0;
  assert.equal(allowedFarmazonPage('https://www.farmazon.com.tr/homepage'), true); tests++;
  for (const url of ['http://www.farmazon.com.tr/homepage',
    'https://farmazon.com.tr.evil.invalid/homepage',
    'https://another.example/homepage', 'chrome-extension://abc/options.html',
    'https://www.farmazon.com.tr/login']) {
    assert.equal(allowedFarmazonPage(url), false); tests++;
  }
  let connected = 0, disconnected = 0, inspected = 0;
  const makeConnect = (url, ui) => async () => {
    connected++;
    return {
      pages: async () => [{url: () => url, evaluate: async () => { inspected++; return ui; }}],
      disconnect: () => { disconnected++; }
    };
  };
  const validUI = { accountMatches: true, hasOrders: true, hasCart: true };
  const valid = await probeFarmazonSession({
    expectedAccount: 'TEST ACCOUNT', brokers: ['http://127.0.0.1:9222'],
    connect: makeConnect('https://www.farmazon.com.tr/homepage', validUI)
  });
  assert.equal(valid.authenticated, true); tests++;
  assert.equal(valid.session_found, true); tests++;
  assert.equal(connected, 1); tests++;
  assert.equal(inspected, 1); tests++;
  assert.equal(disconnected, 1); tests++;
  const unconfigured = await probeFarmazonSession({
    expectedAccount: '', brokers: ['http://127.0.0.1:9222'],
    connect: () => { throw new Error('must not connect without identity binding'); }
  });
  assert.equal(unconfigured.authenticated, false); tests++;
  assert.equal(unconfigured.status, 'expected_account_not_configured'); tests++;
  for (const ui of [{...validUI, accountMatches: false},
    {...validUI, hasOrders: false}, {...validUI, hasCart: false}]) {
    const state = await probeFarmazonSession({
      expectedAccount: 'TEST ACCOUNT', brokers: ['http://127.0.0.1:9222'],
      connect: makeConnect('https://farmazon.com.tr/homepage', ui)
    });
    assert.equal(state.authenticated, false); tests++;
  }
  const evilTab = await probeFarmazonSession({
    expectedAccount: 'TEST ACCOUNT', brokers: ['http://127.0.0.1:9222'],
    connect: makeConnect('https://evil.example/homepage', validUI)
  });
  assert.equal(evilTab.authenticated, false); tests++;
  assert.equal(evilTab.session_found, false); tests++;
  const unavailable = await probeFarmazonSession({
    expectedAccount: 'TEST ACCOUNT', brokers: ['http://127.0.0.1:9222'],
    connect: async () => { throw Error('broker unavailable'); }
  });
  assert.equal(unavailable.authenticated, false); tests++;
  assert.equal(unavailable.status, 'browser_broker_unavailable'); tests++;
  const noUnknownBroker = await probeFarmazonSession({
    expectedAccount: 'TEST ACCOUNT', brokers: ['http://outside.example:9222'],
    connect: async () => { throw Error('should never connect'); }
  });
  assert.equal(noUnknownBroker.authenticated, false); tests++;
  // Remote read path must never receive an account label, DOM, cookie or token.
  const health = await agent.executeRead('site.session.health', {site_id:'farmazon'}, {
    farmazonHealth: async () => valid
  });
  assert.deepEqual(Object.keys(health).sort(),
    ['authenticated','browser_status','profile','site_id'].sort()); tests++;
  assert.equal(health.authenticated, true); tests++;
  assert.equal(agent.riskClass('browser.click'), 'WRITE_EXTERNAL'); tests++;
  assert.equal(agent.riskClass('site.session.health'), 'READ'); tests++;
  let tabChecks = 0;
  const multiTab = await probeFarmazonSession({
    expectedAccount: 'TEST ACCOUNT', brokers: ['http://127.0.0.1:9222'],
    connect: async () => ({
      pages: async () => [
        { url: () => 'https://www.farmazon.com.tr/homepage',
          evaluate: async () => { tabChecks++; return {...validUI, accountMatches:false}; } },
        { url: () => 'https://www.farmazon.com.tr/homepage',
          evaluate: async () => { tabChecks++; return validUI; } }
      ],
      disconnect: () => {}
    })
  });
  assert.equal(multiTab.authenticated, true); tests++;
  assert.equal(tabChecks, 2); tests++;
  let brokerConnections = 0;
  const secondBroker = await probeFarmazonSession({
    expectedAccount: 'TEST ACCOUNT',
    brokers: ['http://127.0.0.1:9222', 'http://127.0.0.1:9223'],
    connect: async ({browserURL}) => {
      brokerConnections++;
      return {
        pages: async () => [{url: () => 'https://www.farmazon.com.tr/homepage',
          evaluate: async () => browserURL.endsWith('9223') ?
            validUI : {...validUI, accountMatches:false}}],
        disconnect: () => {}
      };
    }
  });
  assert.equal(secondBroker.authenticated, true); tests++;
  assert.equal(brokerConnections, 2); tests++;
  const mismatchResult = await probeFarmazonSession({
    expectedAccount: 'TEST ACCOUNT', brokers: ['http://127.0.0.1:9222'],
    connect: async () => ({pages:async()=>[{
      url:()=> 'https://www.farmazon.com.tr/homepage',
      evaluate: async()=>({...validUI, accountMatches:false})
    }], disconnect:()=>{}})
  });
  assert.equal(mismatchResult.status, 'account_or_page_mismatch'); tests++;
  assert.equal(mismatchResult.session_found, true); tests++;
  console.log(JSON.stringify({status:'PASS',tests,scope:'mocked read-only checks',
    financial_writes:0,orders_submitted:0,live_windows_tested:false}));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
