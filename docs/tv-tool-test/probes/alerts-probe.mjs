import { chromium } from "playwright-core";
const OUT = process.argv[2];
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, colorScheme: "dark" });
const errs = []; p.on("pageerror", (e) => errs.push(String(e).slice(0, 300))); p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.text().slice(0, 300)); });
await p.goto("http://localhost:5179/", { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => window.__velaReady && window.__ofAlerts && window.__vela?.active, null, { timeout: 90000 });
await p.waitForTimeout(3000);
const info = await p.evaluate(() => { const c = window.__vela.active.chart; const bars = c.bars(); return { sym: window.__vela.active.symbol, last: bars.at(-1).close, t0: bars.at(-40).time, tm: bars.at(-20).time, now: Date.now() }; });
const B = Math.round(info.last) + 3000, F = info.now + 36e5 * 24, t0 = info.t0, tm = info.tm;
const CASES = [
  ["trendline", [[t0, B], [F, B]]], ["ray", [[t0, B], [F, B]]], ["extendedline", [[t0, B], [F, B]]], ["arrow", [[t0, B], [F, B]]],
  ["infoline", [[t0, B], [F, B]]], ["trendangle", [[t0, B], [F, B]]], ["hline", [[t0, B]]], ["hray", [[t0, B]]],
  ["parallelchannel", [[t0, B - 10], [F, B - 10], [tm, B + 20]]], ["disjointchannel", [[t0, B - 10], [F, B - 10], [t0, B + 20], [F, B + 20]]],
  ["flattopbottom", [[t0, B - 10], [F, B - 10], [tm, B + 20]]], ["box", [[t0, B - 10], [F, B + 20]]],
  ["vline", [[F, B]]], ["fibretracement", [[t0, B - 100], [F, B + 100]]],
  ["long-position", [[tm, B], [F, B - 50], [F, B + 100]]], ["short-position", [[tm, B], [F, B + 50], [F, B - 100]]], ["anchoredvwap", [[t0, B]]],
];
const res = [];
for (const [type, an] of CASES.filter(([t]) => process.argv[3] ? process.argv[3].split(',').includes(t) : true)) {
  const r = { type };
  try {
    const id = await p.evaluate(({ type, an }) => { const c = window.__vela.active.chart; const d = c.drawings.add(type, { anchors: an.map(([time, price]) => ({ time, price })) }); const id = d.id ?? d; c.drawings.openSettings(id); return id; }, { type, an });
    const btn = p.locator('[data-action="add-alert"]').first();
    r.button = await btn.waitFor({ state: "visible", timeout: 6000 }).then(() => true).catch(() => false);
    if (r.button) {
      await btn.click();
      const dlg = p.locator('[data-testid="drawing-alert-dialog"]');
      r.dialog = await dlg.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false);
      r.conds = await p.locator('[data-testid="drawing-alert-condition"] button').allTextContents().catch(() => []);
      if (!r.conds.length) r.conds = [await p.locator('[data-role="drawing-alert-condition"]').innerText().catch(() => "?")];
      await dlg.screenshot({ path: `${OUT}/all-${type}.png` }).catch(() => {});
      await p.locator('[data-testid="drawing-alert-submit"]').click({ timeout: 4000 });
      await p.waitForTimeout(300);
      const vw = await p.evaluate((t0) => { const bs = window.__vela.active.chart.bars().filter((b) => b.time >= t0); let w = 0, pv = 0; for (const b of bs) { const k = b.volume > 0 ? b.volume : 0; w += k; pv += k * (b.high + b.low + b.close) / 3; } return pv / w; }, t0);
      const L = type === "anchoredvwap" ? vw : type === "fibretracement" ? B : B; // fib default level 0.5 = middle = B
      const prices = type.endsWith("channel") || type === "flattopbottom" || type === "box" ? [B - 30, B] : type.endsWith("position") ? [B - 5, B + 5] : [L - 5, L + 5];
      r.fired = await p.evaluate(({ sym, prices, id }) => prices.map((x) => window.__ofAlerts.feed(sym, x).length), { sym: info.sym, prices, id });
      r.left = await p.evaluate((id) => window.__ofAlerts.list().filter((a) => a.drawing?.drawingId === id).map((a) => a.id), id);
      for (const a of r.left) await p.evaluate((a) => window.__ofAlerts.remove(a), a);
    }
    await p.evaluate((id) => window.__vela.active.chart.drawings.remove(id), id);
    await p.keyboard.press("Escape");
  } catch (e) { r.err = String(e).slice(0, 150); }
  res.push(r);
}
for (const r of res) console.log(JSON.stringify(r));
console.log("errs", JSON.stringify(errs));
await b.close();
