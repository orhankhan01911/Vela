import { chromium } from "playwright-core";
// Night sweep 2026-10-30: every audited tool placed fresh on Local, its saved JSON, its dialog tabs, a screenshot.
const OUT = process.argv[2];
const ONLY = (process.argv[3] || "").split(",").filter(Boolean);
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, colorScheme: "dark" });
const errs = []; p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await p.goto("http://localhost:5179/", { waitUntil: "domcontentloaded" });
await p.evaluate(() => { try { localStorage.removeItem("vela.drawings.toolSettings.v1"); } catch {} });
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForFunction(() => window.__velaReady && window.__vela?.active, null, { timeout: 90000 });
await p.waitForTimeout(3000);
await p.evaluate(() => window.__vela.active.chart.panes?.maximize?.("price"));
const C = (s) => s.split(";").map((c) => c.split(",").map(Number));
const TOOLS = [
  ["trendline", "500,400;800,300"], ["hline", "600,350"], ["ray", "500,400;800,300"], ["vline", "700,400"], ["hray", "600,350"],
  ["infoline", "500,400;800,300"], ["parallelchannel", "500,450;800,350;650,250"], ["pitchfork", "450,450;650,300;800,450"],
  ["pricerange", "500,450;800,300"], ["datepricerange", "500,450;800,300"], ["daterange", "500,450;800,300"],
  ["freehand", "drag:450,450;550,380;650,420;750,350"], ["arrowmarker", "500,450;750,300"], ["arrowmarkup", "650,450"], ["arrowmarkdown", "650,300"],
  ["highlighter", "drag:450,450;550,380;650,420;750,350"], ["box", "500,450;800,300"], ["path", "450,450;600,300;750,420;750,420"],
  ["text", "text:600,350"], ["anchoredtext", "text:600,350"], ["callout", "text:500,450;650,330"], ["note", "600,350"], ["anchorednote", "600,350"],
  ["emoji", "650,380"],
];
const rows = [];
for (const [tool, spec] of TOOLS) {
  if (ONLY.length && !ONLY.includes(tool)) continue;
  const r = { tool };
  try {
    await p.evaluate(() => { const c = window.__vela.active.chart.drawings; for (const d of c.all()) if (d.type !== "pricealert") c.remove(d.id); });
    await p.evaluate((t) => window.__vela.active.chart.drawings.setTool(t), tool);
    await p.waitForTimeout(200);
    let s = spec, text = false;
    if (s.startsWith("text:")) { text = true; s = s.slice(5); }
    if (s.startsWith("drag:")) {
      const pts = C(s.slice(5)); await p.mouse.move(...pts[0]); await p.mouse.down();
      for (const pt of pts.slice(1)) await p.mouse.move(pt[0], pt[1], { steps: 8 });
      await p.mouse.up();
    } else for (const [x, y] of C(s)) { await p.mouse.move(x, y); await p.mouse.click(x, y); await p.waitForTimeout(150); }
    await p.waitForTimeout(400);
    if (text) { await p.keyboard.type("Test"); await p.waitForTimeout(150); }
    await p.mouse.click(1150, 820); await p.waitForTimeout(300);
    await p.keyboard.press("Escape").catch(() => {});
    const d = await p.evaluate(() => { const ds = window.__vela.active.chart.drawings.all().filter((d) => d.type !== "pricealert"); return ds.at(-1) ?? null; });
    r.placed = d ? d.type : null;
    r.n = d?.anchors?.length; r.style = d?.style; r.tv = d?.props?.tv; r.text = d?.text ?? d?.props?.text;
    if (tool === "emoji") await p.waitForTimeout(4000); // the emoji art is a lazy chunk: let it load before the picture
    await p.screenshot({ path: `${OUT}/${tool}.png`, clip: { x: 380, y: 180, width: 560, height: 360 } });
    if (d) {
      await p.evaluate((id) => window.__vela.active.chart.drawings.openSettings(id), d.id);
      const bar = p.locator('.vela-dpop').first();
      await bar.waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
      r.bar = await p.locator('.vela-dpop [data-action], .vela-dpop [data-tip]').evaluateAll((es) => es.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.dataset.action || e.dataset.tip));
      await p.locator('.vela-dpop [data-tip="Settings"]').first().click({ timeout: 3000 });
      await p.waitForTimeout(400);
      r.tabs = await p.locator('.vela-drawing-dialog [role="tab"]').allTextContents();
      r.rows = {};
      for (const t of r.tabs) {
        await p.locator('.vela-drawing-dialog [role="tab"]', { hasText: t }).first().click(); await p.waitForTimeout(250);
        r.rows[t] = ((await p.locator('.vela-drawing-dialog').first().innerText().catch(() => "")) || "").replace(/^[\s\S]*?Visibility\n/, "").replace(/\nTemplate[\s\S]*$/, "");
      }
      await p.locator('.vela-drawing-dialog').first().screenshot({ path: `${OUT}/${tool}-dialog.png` }).catch(() => {});
      await p.keyboard.press("Escape"); await p.waitForTimeout(250);
    }
  } catch (e) { r.err = String(e).slice(0, 160); }
  rows.push(r);
  console.log(JSON.stringify(r));
}
console.log("ERRS", JSON.stringify(errs));
await b.close();
