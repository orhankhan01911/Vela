import { chromium } from "playwright-core";
// node gen-probe.mjs OUT TOOL "x,y;x,y" SELECTX,SELECTY [TEXT] [DPR]
const [OUT, TOOL, CLICKS, SEL, TEXT, DPR] = process.argv.slice(2);
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, colorScheme: "dark", deviceScaleFactor: Number(DPR || 1) });
const errs = []; p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await p.goto("http://localhost:5179/", { waitUntil: "domcontentloaded" });
await p.evaluate(() => { try { localStorage.removeItem("vela.drawings.toolSettings.v1"); } catch {} });
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForFunction(() => window.__velaReady, null, { timeout: 90000 });
await p.waitForTimeout(3000);
await p.evaluate(() => window.__vela.active.chart.panes?.maximize?.("price"));
await p.evaluate((t) => window.__vela.active.chart.drawings.setTool(t), TOOL);
{ const pts = CLICKS.split(";").map((c) => c.split(",").map(Number)); await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); for (const [x, y] of pts.slice(1)) { await p.mouse.move(x, y, { steps: 6 }); } await p.mouse.up(); await p.waitForTimeout(200); }
await p.evaluate(() => window.__vela.active.chart.drawings.setTool?.(null));
await p.waitForTimeout(400);
await p.mouse.move(1150, 800); await p.mouse.click(1150, 800); await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/placed.png` });
const [sx, sy] = SEL.split(",").map(Number);
await p.mouse.click(sx, sy); await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/selected.png` });
await p.locator('.vela-dpop [data-tip="Settings"]').first().click();
await p.waitForTimeout(500);
const dlg = p.locator('.vela-drawing-dialog').first();
const tabs = await p.locator('.vela-drawing-dialog [role="tab"]').allTextContents();
const out = { tabs, body: {} };
for (const t of tabs) {
  await p.locator('.vela-drawing-dialog [role="tab"]', { hasText: t }).click(); await p.waitForTimeout(300);
  if (t === "Text" && TEXT) { await p.locator('.vela-drawing-dialog textarea').fill(TEXT); await p.waitForTimeout(200); }
  out.body[t] = (await dlg.innerText()).replace(/Template[\s\S]*$/, "");
  const box = await dlg.boundingBox();
  await p.screenshot({ path: `${OUT}/tab-${t}.png`, clip: box });
}
await p.locator('.vela-drawing-dialog button', { hasText: "Ok" }).click(); await p.waitForTimeout(300);
await p.mouse.click(sx, sy); await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/final-selected.png` });
await p.mouse.click(1150, 800); await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/final-unselected.png` });
out.json = await p.evaluate(() => { const j = window.__vela.active.chart.drawings.toJSON(); return (j.drawings ?? j).slice(-1)[0]; });
out.errs = errs;
console.log(JSON.stringify(out, null, 1));
await b.close();
