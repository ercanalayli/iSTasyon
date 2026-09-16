import { pathToFileURL } from 'node:url';

const source = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\src\\windows-worker.js';
const NativeWebSocket = globalThis.WebSocket;
let injected = 0;
globalThis.WebSocket = class ReadOnlyFaultWebSocket extends NativeWebSocket {
  constructor(url, ...args) {
    super(url, ...args);
    if (injected++ === 0) this.addEventListener('open', () => this.close(), { once: true });
  }
};
const { pageValue } = await import(pathToFileURL(source).href);
const result = await pageValue('https://uygulama.bizimhesap.com/web/ngn/acc/ngncostss',
  "(async()=>{const r=await fetch('/api/AngularControllers/firms/getcurrentfirm',{credentials:'include'});const j=await r.json();const f=j?.Data||j?.data||j;return {authenticated:r.ok&&!!f,alayli:/ALAYLI/i.test(String(f?.Name||f?.name||f?.dsFirm||''))}})()");
process.stdout.write(JSON.stringify({ cdpDisconnectInjected: injected > 0, authenticated: result.authenticated, alayli: result.alayli, financialWrites: 0 }) + '\n');
if (!result.authenticated || !result.alayli) process.exitCode = 2;
