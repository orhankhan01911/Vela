# TV tool test spec

How we bring one drawing tool (or any chart feature) to one-to-one parity with TradingView, and how we prove it.
Written 2026-10-30 after tools #1–#23 of the drawing-tools audit. The user asked for this so any session can run it
without learning it again ("make a design spec so another session do not require").

Use it for every tool in the audit list, and for other TradingView-copied UI, such as the layout menu.

## 0. Ground rules

- **TradingView is the spec.** Read its code and its UI. Do not guess, and do not ask the user to record what CDP can
  tell you. If the user sends a video or screenshot, it is evidence: read it frame by frame
  (`ffmpeg -vf fps=1/2` → tile into a contact sheet).
- **Default settings first.** Compare a freshly placed tool, with no remembered settings on either side. TradingView
  Desktop has the user's own templates, so read the **factory** defaults from its code (§2), not from a new shape.
- **Never click Template → "Apply defaults" in TradingView.** It deletes the user's saved default for that tool.
- **Never click Create on a TradingView alert.**
- **Only touch your own shapes.** Create them with the API, remember their ids, and remove them when done. The user is
  often working in TradingView at the same time.
- **Reconnect it yourself.** If TradingView shows "Session disconnected", click its Connect button. Do not ask.
- **Keep saved drawings as they were.** A new look applies only to new drawings (§4).
- **One tool per loop.** Fix it, prove it, send a card, and wait for the user's "Tested, good" before the next tool.

## 1. Tools and setup

| What | Where |
| --- | --- |
| TradingView Desktop | CDP port **9223** (Brave holds 9222). MCP `tradingview` tools: `ui_evaluate`, `capture_screenshot`, `ui_mouse_click` |
| Ours (Local) | `http://localhost:5179` (vela-sandbox, served by its own Vite; never start your own) |
| Vela fork | `~/Desktop/claude_folder/worktrees/vela-alert-pin` (rebuild: `npx tsup`, then `touch dist/*.js`) |
| Sandbox | `~/Desktop/claude_folder/worktrees/project-options-tv-chart-live/frontend/vela-sandbox` |
| Probes | `docs/tv-tool-test/probes/*.mjs` here: copy into `vela-sandbox/e2e/zz-*.mjs`, run from `vela-sandbox`, delete after |

`capture_screenshot` gives a 2560-wide image, shown at 2000 wide (multiply displayed coordinates by 1.28). To look
closely, crop with `ffmpeg -vf crop=w:h:x:y` (PIL is not installed).

## 2. Read TradingView (facts, not impressions)

1. **Create your own shape** so its code module loads (most tool modules load lazily):
   `await chart.createMultipointShape(points, { shape: 'rectangle' })` or `createShape(point, { shape: 'note' })`.
   Put prices inside the visible range (`chart.getPanes()[0].getMainSourcePriceScale().getVisiblePriceRange()`).
   `ui_evaluate` returns `{}` for an async expression, so set `window.__myX = id` and read it in a second call.
2. **Find the module:** search `window.webpackChunktradingview` module sources for `defaultName:"linetool<name>"`
   (or the class name, such as `LineToolEmoji`). Read `f.toString()` in slices of about 7000 characters.
3. **Read from the module:**
   - **Factory defaults:** the object passed as `factoryDefaultsSupplier`, plus the themed map.
   - **Colour names → hex:** look them up in module `872966` (`"color-grapes-purple-500":"#9c27b0"`).
   - **`generateColor(c, t)`:** with a hex colour it sets alpha to `1 - t/100`; with an `rgba()` string it returns the
     colour unchanged.
   - **Dialog rows:** read the `_stylePropertyDefinitions` / `_textPropertyDefinitions` order. Row titles are
     translation modules (`n.t(null, void 0, i(169407))`); read those modules: `exports=["Border"]`.
   - **Coordinates tab:** shown only when `hasEditableCoordinates()` is true. Text, emoji, icon and anything anchored
     set it false.
   - **Renderer:** the pane view's `_updateImpl` / `_drawImpl`: geometry, paddings, stroke-then-fill order, caps
     and joins.
   - **Handles:** the anchor points and their `cursorType` enum (module 118279: 6 `ns-resize`, 7 `ew-resize`,
     8 `nesw`, 9 `nwse`), `square`, the ring colour.
4. **Read the live renderer** of your shape:
   - Select it: `src._model.selectionMacro(s => { s.clearSelection(); s.addItemToSelection(src) })`. A mouse click on
     the line does not select it.
   - Read its view: `[...src._paneViews.values()].flat()[0].renderer({...})`, then `_lineAnchorRenderers[0]._data`.
5. **Dialogs and menus:** open with the widget's own method (`chartWidget.showPropertiesDialog(src)`) or by clicking
   the button. Screenshot, read every tab and every row, then close with the same button or Escape. If a dialog is
   already open, it is the user's: leave it alone.
6. **Remove your shapes:** `chart.removeEntity(id)`. Check `getAllShapes()` no longer lists them.
7. **Bulk data** (emoji lists, icon code points): export through CDP straight to a file with Node 22
   (`probes/tv-export-module.mjs`; Node 20 has no WebSocket), so it does not flood the conversation.

## 3. Probe ours

- **`gen-probe.mjs OUT TOOL "x,y;x,y" SELX,SELY [TEXT]`:** places a click tool with tool memory cleared. It dumps
  every dialog tab's text, screenshots each tab and the canvas (placed, selected, unselected), and prints the saved
  JSON and any page errors.
- **`text-probe.mjs`:** the same for tools that open an inline editor on placement. It types `$TYPE`.
- **`brush-probe.mjs`:** press-drag tools (brush, highlighter).
- **`layout-probe.mjs`:** the layout chip and menu flow (an example of a whole-feature probe).
- **What to read in the output:**
  - Tab list and row labels against TV's.
  - The saved JSON: `style`, `props` (with `tv: true` for new drawings), text defaults.
  - The screenshots: look at the pixels, not only at the DOM.
- **If the JSON parse fails right after a rebuild,** the dev server was reloading. Run the probe again.

## 4. Fix in the Vela fork

- **New-only TradingView look:** the type gets `tv?: boolean`, set in the constructor when `!init.props`, and
  written in `writeProps`. Old saved drawings either have props (and keep their look) or are given an empty bag by a
  registry migration (`legacyStroke` and friends in `registry.ts`) when they were saved with no props.
  **Check this:** a type whose `writeProps` returned `undefined` will turn old drawings into TradingView's on reload
  unless you add the migration (the brush shipped with this bug; fixed in 1e8ac62).
- **Shared hooks on `Drawing`:**
  - `handleShapes()`, `handleCursor(i)`, `handleHidden(i)`.
  - `dragHandlePx(i, x, y, proj)` for handles that are not anchors.
  - `selectionMarkers(proj)`, `axisPoints()` (return `[]` for screen-pinned tools).
  - `textDefaults()`, `finishesOnSamePoint()`.
- **Registry `defaultStyle`:** use TradingView's colours, with a `// palette-exempt: reason` comment on the same line.
  Comments must not contain hex values (the palette guard scans them).
- **Dialog:** a dedicated builder when TradingView's rows differ from the generic schema rows (for example
  `buildRectangleStyle`). Row labels are what TradingView shows (read the label, not the property name).
- **Untrusted values:** colours and widths from a saved layout must not go into CSS text unchecked. Use
  `safeCssColor` / `safeCssPx` (`renderers/shared/drawing-geometry.ts`).

## 5. Prove it

1. Tests: a new `test/drawings-<tool>-tv.test.ts` covering defaults, the saved-drawing case, geometry, handles,
   cursors, drags, dialog tabs and rows, and painter ops where the shape matters (record `ctx` calls).
2. The whole suite: `npx vitest run`. Known failures: the `renderer-layers` idle-layer test, and the timing-flaky
   `bar-store-merge` / `price-style-change-event` tests. Anything else is yours until shown otherwise.
3. `npx tsc --noEmit -p .` (ignore the stray `test/zz-schema-dump.test.ts` "process" error) and eslint on the touched
   src files.
4. Rebuild, probe again, and **look at the screenshots** (crop and zoom).
5. `ONLY=chromium ZOOMS=1,1.25,1.5 node e2e/text-zoom-matrix.mjs` in vela-sandbox.
6. For anything on the top bar or in a phone menu: `node e2e/phone-menus.mjs`.
7. If you added strings: run the sandbox `src/i18n` tests. Every `vt()` / menu label needs all 12 languages
   (`src/i18n/locales/*.json`). Vela's drawing strings are scanned too.

## 6. Commit

- **Commit by pathspec only.** Other sessions edit the same worktrees. Never `git add -A`, `stash`, `reset` or
  `checkout`.
- **When a file you touched also has someone else's edits** (staged or not), commit through a temporary index built
  from HEAD with only your change applied, then put your change into the real index entries too, so their staged work
  stays staged. See the layout commit 4bd75dc7d for the script pattern.
- **Message:** what TradingView does (module ids), what changed, what saved drawings keep, plus the Co-Authored-By and
  Claude-Session lines.

## 7. Card and wait

Send a PushNotification and an `AskUserQuestion` card covering:

- What changed, in plain words.
- Where to test it ("Local :5179, hard refresh").
- What still differs from TradingView, and anything you left out on purpose.

Then wait for "Tested, good: next tool" before moving on. Update the audit memory
(`project_drawing_tools_tv_audit_20261030.md`) with the commit id and the approval.

## 8. Shipping

Nothing ships without the user's word. The order is Local → emulator check → Tester → dmcharts (the dmcharts gate
asks the user). Ship only the approved commits, never a whole line that carries unapproved work.

## Known TradingView facts, collected so far

| Tool | Module | Key facts |
| --- | --- | --- |
| Pitchfork | — | Style dropdown Original / Schiff / Modified Schiff / Inside; nine levels |
| Ranges | 294865, 283739, 863686, 67959 | plates at `calculateLabelPosition`; font 12 |
| Brush / highlighter | 562921, 644455 | smoothing window 5; highlighter #F23645 at 20 %, 20 px, Thickness 8–96 |
| Arrow marker / marks | 683400, 100077 | marker #1E53E5; marks green #089981 / red #CC2F3C |
| Rectangle | 787889 | #9c27b0 2 px, fill at 20 %; 8 handles; text Top = above, Inside, Bottom = below |
| Path | 592788 | blue 2 px; right end an arrow; ends on a click within 5 px of the last point |
| Arrow ends | 98638 / 392939 | arms 5 × line width, 45° |
| Text | 210166 | #2962FF 14 px; Text + Visibility tabs; 1.5 px outline; wrap handle (min 100) |
| Callout | 583711 | white text on #0097A7 at 70 %, 2 px border; radius 8 + margin 2; wedge tail |
| Note ("Pin") | 229151 | 24 × 30 pin; 236 px tooltip, caret 12 × 10, shadow; Label row |
| Emoji / icon | 275496, 820690, 637188, 528863 | Twemoji SVG; FA4 glyph paths; size 72, angle π/2; 4 resize corners + rotate zones |
| Zoom in / out | 649873 | box between bar centres, zoomToViewport (bars + prices, autoscale off), zoom stack + Zoom out button; box blue 30 %/80 % |
| Ruler (Measure) | 649873, 516130, 847997 | 20 % blue/red box, blue-600 lines, arrows ≥ 50 px, label 12 px gap 8 pad 9, 10 px past the end; change (pct) ticks / bars, span / Vol |
| Layout menu | (UI) | Save layout, Autosave, Share, Make a copy, Rename, Download data, Create, Recently used, Open (".") |
