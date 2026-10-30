// Paste into the tradingview MCP `ui_evaluate` (CDP 9223). It places one of YOUR OWN shapes per tool, opens its
// settings dialog, reads every tab's rows, presses Cancel and removes the shape. It never touches other shapes.
// ui_evaluate returns {} for async code: run this once, then read the result with a second call:
//   JSON.stringify({ done: window.__wkDone, res: window.__wkRes })
(() => {
  const c = window.TradingViewApi.activeChart();
  const r = c.getVisibleRange();
  const ps = c.getPanes()[0].getMainSourcePriceScale().getVisiblePriceRange();
  const T = (f) => Math.round(r.from + (r.to - r.from) * f), P = (f) => ps.from + (ps.to - ps.from) * f;
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const one = [{ time: T(0.6), price: P(0.5) }], two = [{ time: T(0.5), price: P(0.4) }, { time: T(0.7), price: P(0.6) }];
  const three = [{ time: T(0.45), price: P(0.4) }, { time: T(0.6), price: P(0.6) }, { time: T(0.75), price: P(0.45) }];
  // TradingView's shape names (createMultipointShape); add the ones you need.
  const L = [['trend_line', two], ['horizontal_line', one], ['ray', two], ['vertical_line', one], ['horizontal_ray', one], ['info_line', two],
    ['parallel_channel', three], ['pitchfork', three], ['price_range', two], ['date_and_price_range', two], ['date_range', two], ['brush', three],
    ['arrow_marker', two], ['arrow_up', one], ['arrow_down', one], ['highlighter', three], ['rectangle', two], ['path', three],
    ['text', one], ['anchored_text', one], ['callout', two], ['note', one], ['anchored_note', one], ['emoji', one]];
  const dump = async () => {
    const d = document.querySelector('[data-name="source-properties-editor"]');
    if (!d) return { err: 'no dialog' };
    const tabs = [...d.querySelectorAll('[role="tab"]')];
    const out = { tabs: tabs.map((t) => t.textContent.trim()), rows: {} };
    for (const t of tabs) {
      t.click(); await sleep(350);
      out.rows[t.textContent.trim()] = d.innerText.replace(/^[\s\S]*?Visibility\n/, '').replace(/\nTemplate[\s\S]*$/, '').replace(/\n/g, ' | ');
    }
    [...d.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cancel')?.click();
    return out;
  };
  window.__wkRes = {}; window.__wkDone = false;
  (async () => {
    for (const [s, pts] of L) {
      const before = new Set(c.getAllShapes().map((x) => x.id));
      try { await c.createMultipointShape(pts, { shape: s }); } catch (e) { window.__wkRes[s] = { err: String(e).slice(0, 80) }; continue; }
      await sleep(400);
      const mine = c.getAllShapes().filter((x) => !before.has(x.id));
      c.selection().clear(); c.selection().add(mine.map((m) => m.id)); await sleep(600);
      const bar = [...document.querySelectorAll('[class*="floating-toolbar"]')].find((e) => e.getBoundingClientRect().width > 0 && e.querySelector('[data-name="settings"]'));
      const res = { bar: bar ? [...bar.querySelectorAll('[data-name]')].filter((e) => e.getBoundingClientRect().width > 0 && !/^FavoriteToolbar/.test(e.getAttribute('data-name'))).map((e) => e.getAttribute('data-name')) : null };
      bar?.querySelector('[data-name="settings"]')?.click(); await sleep(700);
      Object.assign(res, await dump());
      window.__wkRes[s] = res;
      await sleep(300); c.selection().clear();
      for (const m of mine) c.removeEntity(m.id);
      await sleep(200);
    }
    window.__wkDone = true;
  })();
  return 'started';
})();
