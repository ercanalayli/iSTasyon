import { pathToFileURL } from 'node:url';

const source = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\src\\windows-worker.js';
const nativeFetch = globalThis.fetch;
let injected = 0;
globalThis.fetch = (input, init) => {
  if (String(input).startsWith('http://127.0.0.1:9222/json/version') && injected < 2) {
    injected += 1;
    return Promise.reject(new Error('simulated_transient_network_failure'));
  }
  return nativeFetch(input, init);
};
const { pageValue } = await import(pathToFileURL(source).href);
const result = await pageValue('https://uygulama.bizimhesap.com/web/ngn/acc/ngncostss',
  "(async()=>{const r=await fetch('/api/AngularControllers/firms/getcurrentfirm',{credentials:'include'});const j=await r.json();const f=j?.Data||j?.data||j;return {authenticated:r.ok&&!!f,alayli:/ALAYLI/i.test(String(f?.Name||f?.name||f?.dsFirm||''))}})()");
process.stdout.write(JSON.stringify({ networkFailuresInjected: injected, authenticated: result.authenticated, alayli: result.alayli, financialWrites: 0 }) + '\n');
if (injected !== 2 || !result.authenticated || !result.alayli) process.exitCode = 2;
