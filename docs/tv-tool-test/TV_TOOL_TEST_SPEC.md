# TV tool test spec

How to make a drawing tool (or any chart feature) work exactly like TradingView, and how to prove it.
Written 2026-10-30 during the drawing-tools audit; updated the same night after a check of all 26 tools.
The user asked for it so any session can do this work without learning it again.

Use it for every tool in the audit list and for any other UI copied from TradingView (for example the layout menu).

## 0. Rules

- **TradingView is the spec.** Read its code and its UI. Do not guess. Do not ask the user for anything you can read
  from TradingView yourself. A video or screenshot from the user is evidence: read it frame by frame (`ffmpeg -vf fps=1/2`, then tile).
- **Compare default settings.** Use a freshly placed tool with no remembered settings on either side. TradingView
  Desktop has the user's own templates, so its **values** (colours, sizes, alignment) come from its code (§2), not
  from a new shape. Its **labels, tabs and buttons** can be read from a new shape.
- **Never click Template → "Apply defaults" in TradingView.** It deletes the user's saved default for that tool.
- **Never click Create on a TradingView alert.**
- **Touch only your own shapes.** Create them with the API, keep their ids, remove them when done, and check that
  only the user's shapes are left. The user often works in TradingView at the same time.
- **If TradingView shows "Session disconnected",** click its Connect button yourself.
- **Saved drawings keep their look.** A new look applies to new drawings only (§4).
- **Do not copy TradingView's artwork** (icons, stickers). Draw our own icon.
- **One tool per loop.** Fix it, prove it, send a card, and wait for the user's "Tested, good" before the next tool.

## 1. Where things are

| What | Where |
| --- | --- |
| TradingView Desktop | CDP port **9223** (Brave holds 9222). MCP `tradingview` tools: `ui_evaluate`, `capture_screenshot`, `ui_mouse_click` |
| Ours (Local) | `http://localhost:5179` (vela-sandbox, served by its own Vite; never start your own) |
| Vela fork | `~/Desktop/claude_folder/worktrees/vela-alert-pin` (rebuild: `npx tsup`, then `touch dist/*.js`) |
| Sandbox | `~/Desktop/claude_folder/worktrees/project-options-tv-chart-live/frontend/vela-sandbox` |
| Probes | `vela-alert-pin/docs/tv-tool-test/probes/`. Copy a `.mjs` to `vela-sandbox/e2e/zz-<name>.mjs` (it needs that folder's `playwright-core`), run `node e2e/zz-<name>.mjs ...` from `vela-sandbox`, then delete the copy. `tv-read-dialogs.js` is pasted into `ui_evaluate`; `sweep-compare.py` runs from anywhere |
| Ship lock | `~/Desktop/claude_folder/claude/project-options/.tester-ship.lock` (`flock` it around any Tester / dmcharts ship) |
| Memory | `~/.claude/projects/-home-hammad-Desktop-claude-folder-claude-project-options/memory/project_drawing_tools_tv_audit_20261030.md` |

- `capture_screenshot` gives a 2560-wide image shown 2000 wide: multiply shown coordinates by 1.28.
  `ui_mouse_click` takes CSS pixels: read them from `getBoundingClientRect()`, not from the screenshot.
- To look closely, crop with `ffmpeg -vf crop=w:h:x:y` (PIL is not installed).
- `ui_evaluate` returns `{}` for async code. Start the work, store the result on `window`, read it in a second call.

## 2. Read TradingView

In `ui_evaluate`, `chart` is `window.TradingViewApi.activeChart()`.

1. **Make your own shape** so the tool's code loads (most tool modules load lazily):
   `chart.createMultipointShape(points, { shape: 'rectangle' })`. Put the points inside the visible range
   (`chart.getVisibleRange()`, `chart.getPanes()[0].getMainSourcePriceScale().getVisiblePriceRange()`).
   Only text tools take a `text` option; giving it to other shapes makes the call fail.
2. **Find its module:** loop over `window.webpackChunktradingview`; each chunk's `chunk[1]` maps module ids to
   functions `f`. Search their sources for `defaultName:"linetool<name>"` (or the
   class name, such as `LineToolEmoji`). Read `f.toString()` in slices of about 7000 characters.
3. **Read from the module:**
   - Factory defaults: the object given as `factoryDefaultsSupplier`, plus the themed map.
   - Colour names to hex: module `872966` (`"color-grapes-purple-500":"#9c27b0"`).
   - `generateColor(c, t)`: with a hex colour it sets alpha to `1 - t/100`; with `rgba()` it returns it unchanged.
   - Dialog rows: the `_stylePropertyDefinitions` / `_textPropertyDefinitions` order. Row titles are translation
     modules (`n.t(null, void 0, i(169407))` → `exports=["Border"]`).
   - Coordinates tab: shown only when `hasEditableCoordinates()` is true (false for text, emoji, icon, anchored).
   - Renderer: the pane view's `_updateImpl` / `_drawImpl` (geometry, paddings, stroke/fill order, caps, joins).
   - Handles: anchor points and `cursorType` (module 118279: 6 `ns-resize`, 7 `ew-resize`, 8 `nesw`, 9 `nwse`).
4. **Select your shape:** `chart.selection().clear(); chart.selection().add([id])`. The floating toolbar then shows;
   its buttons have `data-name` (`templates`, `line-tool-color`, `settings`, `add-alert`, ...).
5. **Dialogs:** click the toolbar's `settings` button. The dialog is `[data-name="source-properties-editor"]`; click
   each `[role="tab"]` and read `innerText`. Close with Cancel. If a dialog was already open, it is the user's:
   leave it alone.
6. **Remove your shapes:** `chart.removeEntity(id)`, then check `getAllShapes()` lists only the user's shapes.
7. **Bulk data** (emoji lists, icon code points): export through CDP straight to a file with Node 22
   (`node probes/tv-export-module.mjs OUT.json`; it exports the emoji and icon groups, modules 825958 and 621674;
   change the module ids for other data), so it does not flood the conversation.

## 3. Probe ours

**One tool:**

Arguments: `OUT` is an existing folder for screenshots; `TOOL` is Vela's id (`trendline`, `box`, `freehand`), not
TradingView's name (`trend_line`, `rectangle`). The full list of ids with TradingView's names is the `M` map in
`probes/sweep-compare.py`; working click points for every tool are the `TOOLS` list in `probes/sweep-probe.mjs`; points are CSS pixels in the probe's 1400 × 900 window; `SELX,SELY` is a
point on the placed shape (a click there selects it); `DPR` is the device pixel ratio (default 1).

- `gen-probe.mjs OUT TOOL "x,y;x,y" SELX,SELY [TEXT] [DPR]`: places a click tool with tool memory cleared, dumps
  every dialog tab, screenshots each tab and the canvas, prints the saved JSON and page errors.
- `text-probe.mjs OUT TOOL "x,y" SELX,SELY [TEXT] [DPR]`: the same for tools that open an editor on placement. What it
  types comes from the environment variable `TYPE` (`TYPE='Hi' node e2e/zz-text.mjs ...`; default "Hello world");
  `TEXT` fills the dialog's Text tab. To give `DPR` without `TEXT`, pass `""` for `TEXT`.
- `brush-probe.mjs OUT TOOL "x,y;x,y;..." SELX,SELY [TEXT] [DPR]`: press-drag tools; the points are the drag path.
- `layout-probe.mjs OUT`: the layout chip and menu (an example of a whole-feature probe).

**All tools at once (the regression check, run it after any shared change):**

The audit has 26 tools: 24 are placed on the chart, the other two (Zoom and the Ruler) are modes, checked by hand.

1. `node e2e/zz-sweep.mjs DIR > DIR/run2.txt` (a copy of `sweep-probe.mjs`; `DIR` must exist; add `tool,tool` after
   `DIR` to run only some): places the 24 placed tools fresh on Local and prints, per tool, the saved
   style, the floating-toolbar buttons, every dialog tab with its rows, and page errors. Screenshots go to `DIR`.
2. Paste `tv-read-dialogs.js` into `ui_evaluate`: the same from TradingView (toolbar `data-name`s, tabs, rows), on your
   own shapes, removed after. It returns `'started'` and takes about a minute. Then call `ui_evaluate` with
   `JSON.stringify(window.__wkDone && window.__wkRes)` until it is not `false`. Save it as `DIR/tv.json` with
   `~/.nvm/versions/node/v22.22.3/bin/node <probes>/tv-save-result.mjs DIR/tv.json` (reads it over CDP, no copying).
3. `python3 ~/Desktop/claude_folder/worktrees/vela-alert-pin/docs/tv-tool-test/probes/sweep-compare.py DIR`. It puts the two side by side and prints `OK`, the real differences, or `REDO` when TradingView's entry for a tool failed (run step 2 again) (known, expected ones
   are skipped: bold/italic icons, "time" for "bar", values from TradingView's saved templates).
4. `bash ~/Desktop/claude_folder/worktrees/vela-alert-pin/docs/tv-tool-test/probes/tile.sh DIR` puts the screenshots into one numbered sheet (`DIR/sheet.png`, numbers listed in the
   output). Look at it.

**Alerts on drawings:** `alerts-probe.mjs OUT [type,type]` adds an alert to every drawing type that takes one, feeds
prices across it (`window.__ofAlerts.feed`) and reports whether it fired. Programmatic drawings show their toolbar
through `chart.drawings.openSettings(id)` (`select()` does not).

**What to look at:** tab list and row labels against TradingView's, the saved JSON (`style`, `props.tv` on new
drawings, text defaults), and the screenshots themselves. If the JSON parse fails right after a rebuild, the dev
server was reloading: run it again.

## 4. Fix in the Vela fork

- **New look for new drawings only:** the type gets `tv?: boolean`, set in the constructor when `!init.props` and
  written in `writeProps`. Old drawings saved without props get an empty bag from a registry migration
  (`legacyStroke` and friends in `registry.ts`). **Check it:** a type whose `writeProps` returned `undefined` turns old
  drawings into the new look on reload unless you add the migration (the brush shipped with this bug; fixed 1e8ac62).
- **Shared hooks on `Drawing`:** `handleShapes()`, `handleCursor(i)`, `handleHidden(i)`, `dragHandlePx(i, x, y, proj)`,
  `selectionMarkers(proj)`, `axisPoints()` (`[]` for screen-pinned tools), `textDefaults()`, `finishesOnSamePoint()`.
- **Floating toolbar:** `TV_QUICK_BAR` in `DrawingSettingsPopup.ts` lists TradingView's colour / width / style / size
  buttons per tool, in its order (line colour, background, text colour, width, style). Add a row for a new tool.
- **Registry `defaultStyle`:** TradingView's colours, with `// palette-exempt: reason` on the same line. Comments must
  not contain hex values (the palette guard scans them).
- **Dialog:** a dedicated builder when TradingView's rows differ from the generic rows (e.g. `buildRectangleStyle`).
  Use the label TradingView shows, not the property name.
- **Untrusted values:** colours and widths from a saved layout never go into CSS text unchecked: `safeCssColor`,
  `safeCssPx` (`renderers/shared/drawing-geometry.ts`).
- **Strings the i18n scan reads:** `label: '...'` and `text: '...'` literals count as interface text. Do not write a
  data table as `{ text: 'anchoredtext' }`; build it another way.

## 5. Prove it

Steps 1 to 4 run in the Vela fork (`vela-alert-pin`); steps 5 and 6 in `vela-sandbox`.

1. A test file `test/drawings-<tool>-tv.test.ts`: defaults, the saved-drawing case, geometry, handles, cursors, drags,
   dialog tabs and rows, and the painter's calls where the shape matters.
2. Whole suite: `npx vitest run`. Known failures: the `renderer-layers` idle-layer test and the timing-flaky
   `bar-store-merge` / `price-style-change-event`. Anything else is yours until shown otherwise.
3. `npx tsc --noEmit -p .` (ignore `test/zz-schema-dump.test.ts`) and eslint on the files you touched.
4. Rebuild, probe again, and **look at the screenshots**.
5. `ONLY=chromium ZOOMS=1,1.25,1.5 node e2e/text-zoom-matrix.mjs` in vela-sandbox.
6. Anything on the top bar, the floating toolbar or a phone menu: `node e2e/phone-menus.mjs`, and check the toolbar
   fits at 360 and 393 px.
7. Anything touched by finger (toolbar buttons, text editing, panels): the emulators (Pixel 5, Fold, Tablet) with real
   taps. A headless touch browser (`hasTouch`) finds most touch bugs faster; the emulator confirms. Make sure the price
   pane is shown first (`chart.panes.maximize('price')`; it is a toggle, so look at a screenshot first: a second call shrinks it back): a stray double tap can leave another pane enlarged.
8. New strings: run the sandbox `src/i18n` tests. Every `vt()` / menu label needs all 12 languages
   (`src/i18n/locales/*.json`). Vela's drawing strings are scanned too.

## 6. Commit

- **By pathspec only.** Other sessions edit the same worktrees. Never `git add -A`, `stash`, `reset` or `checkout`.
- **A file that also has someone else's edits:** commit through a temporary index built from HEAD with only your
  change, then put your change into the real index too, so their staged work stays staged (commit 4bd75dc7d in the
  project-options repo shows the script).
- **Message:** what TradingView does (module ids), what changed, what saved drawings keep, then the
  Co-Authored-By and Claude-Session lines.

## 7. Card and wait

A "card" is a PushNotification plus an `AskUserQuestion` (it reaches the user's phone). Send one covering:

- What changed, in plain words.
- Where to test it ("Local :5179, hard refresh").
- What still differs from TradingView, and what you left out on purpose.

Wait for "Tested, good: next tool". Update the audit memory (`project_drawing_tools_tv_audit_20261030.md`) with the
commit id and the approval.

## 8. Shipping

Nothing ships without the user's word. The Tester is the testers' site (`orderflow.dmterminal.net`); dmcharts is the
public site, built from the Tester line. Order: Local → emulator check → Tester → dmcharts (the dmcharts gate asks the
user). Ship only approved commits, never a whole line that carries unapproved work. Another session may be shipping
on the same line: use the shared ship lock and build on top of what is live.

## Known TradingView facts

| Tool | Module | Key facts |
| --- | --- | --- |
| Pitchfork | — | Style dropdown Original / Schiff / Modified Schiff / Inside; nine levels |
| Ranges | 294865, 283739, 863686, 67959 | plates at `calculateLabelPosition`; font 12 |
| Brush / highlighter | 562921, 644455 | smoothing window 5; highlighter #F23645 at 20 %, 20 px, Thickness 8–96 |
| Arrow marker / marks | 683400, 100077 | marker #1E53E5; marks green #089981 / red #CC2F3C; marks' Style row is "Arrow", the marker's "Color" |
| Rectangle | 787889 | #9c27b0 2 px, fill at 20 %; 8 handles; text Top = above, Inside, Bottom = below |
| Path | 592788 | blue 2 px; right end an arrow; ends on a click within 5 px of the last point |
| Arrow ends | 98638 / 392939 | arms 5 × line width, 45° |
| Text | 210166 | #2962FF 14 px; Text + Visibility tabs; 1.5 px outline; wrap handle (min 100) |
| Callout | 583711 | white text on #0097A7 at 70 %, 2 px border; radius 8 + margin 2; wedge tail |
| Note ("Pin") | 229151 | 24 × 30 pin; 236 px tooltip, caret 12 × 10, shadow; Label row |
| Emoji / icon | 275496, 820690, 637188, 528863 | Twemoji SVG; FA4 glyph paths; size 72, angle π/2; 4 resize corners + rotate zones |
| Zoom in / out | 649873 | box between bar centres, zoomToViewport (bars + prices, autoscale off), zoom stack + Zoom out button; box blue 30 %/80 %, no marks on the scales; a pending zoom is cancelled by right-click (Escape did not reach it) |
| Ruler (Measure) | 649873, 516130, 847997 | 20 % blue/red box, blue-600 lines, arrows ≥ 50 px, label 12 px gap 8 pad 9, 10 px past the end; change (pct) ticks / bars, span / Vol; its span shaded on both scales with blue chips at both ends |
| Layout menu | (UI) | Save layout, Autosave, Share, Make a copy, Rename, Download data, Create, Recently used, Open (".") |
| Coordinates rows | (UI) | "#1 (price, bar)"; ours say "#1 (price, time)" because our field is a date (the user's call) |
| Floating toolbar | (UI) | order: templates, line colour, background, text colour, width, style, settings, add-alert, lock, anchor, remove, more; no text-editing button (texts edit on double-click / double tap, a line's text in the dialog) |
| Anchor drawing | (UI) | `toggle-anchor` on text, anchored text, note, anchored note; pressed = pinned to the screen |
| Alerts on drawings | 772967, 338068, 240429 | lines: Crossing (default), Up, Down, Greater, Less; channels: Entering / Exiting / Inside / Outside; rectangle: those + Greater / Less; vertical line: Crossing only, no Trigger; Fib retracement: line conditions on one level or channel conditions between two (third field); position: "Hits entry, stop, or target level", once; anchored VWAP: line conditions on VWAP or a band; Fib channel: no alert |
