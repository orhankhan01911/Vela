// Save tv-read-dialogs.js's result straight to a file (needs Node 22 for WebSocket): ~/.nvm/versions/node/v22.22.3/bin/node tv-save-result.mjs DIR/tv.json
import { writeFileSync } from 'node:fs';
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const t = list.find((x) => x.type === 'page' && /tradingview\.com\/chart/.test(x.url));
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: 'JSON.stringify(window.__wkDone && window.__wkRes)', returnByValue: true } }));
const msg = await new Promise((r) => ws.addEventListener('message', (e) => r(JSON.parse(e.data))));
const value = msg.result.result.value;
if (!value || value === 'false') {
  console.error('not ready: tv-read-dialogs.js has not finished (window.__wkDone is false). Wait and run this again.');
  ws.close();
  process.exit(1);
}
writeFileSync(process.argv[2], value);
ws.close();
console.log('saved', value.length);
