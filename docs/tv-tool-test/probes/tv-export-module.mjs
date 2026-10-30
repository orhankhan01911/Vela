// Export TradingView's emoji groups (module 825958) and icon groups (module 621674) to JSON, from TV Desktop (CDP 9223).
import { writeFileSync } from 'node:fs';
const OUT = process.argv[2];
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const t = list.find((x) => x.type === 'page' && /tradingview\.com\/chart/.test(x.url));
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
const expr = `(() => {
  const g = (k) => { for (const ch of window.webpackChunktradingview) { const f = (ch[1] || {})[k]; if (f) return f.toString(); } };
  const src = g('825958');
  // the arrays are const T=[...],M=[...],B=[...],I=[...],A=[...],R=[...],V=[...],b=[...]
  const arr = {};
  for (const name of ['T','M','B','I','A','R','V','b']) {
    const re = new RegExp('[,;\\\\s]' + name + '=(\\\\[[^\\\\]]*\\\\])');
    const m = src.match(re);
    arr[name] = m ? JSON.parse(m[1]) : null;
  }
  const titles = {};
  for (const [k, id] of Object.entries({ recent: '465456', T: '306070', M: '668449', B: '147500', I: '574715', A: '123138', R: '943393', V: '276609', b: '174178' })) {
    const s = g(id) || ''; const m = s.match(/exports=\\[\"([^\"]+)\"/); titles[k] = m ? m[1] : null;
  }
  const isrc = g('621674');
  return { arr, titles, icons: isrc };
})()`;
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id !== 1) return;
  writeFileSync(OUT, JSON.stringify(d.result.result.value ?? d.result));
  console.log('wrote', OUT);
  ws.close();
  process.exit(0);
});
setTimeout(() => { console.log('timeout'); process.exit(2); }, 10000);
