# Compare our dialogs with TradingView's, tool by tool.
# Usage: python3 sweep-compare.py DIR
#   DIR/tv.json   = the result of tv-read-dialogs.js (JSON.stringify(window.__wkRes)), saved by hand
#   DIR/run2.txt  = the output of sweep-probe.mjs
# Known, expected differences are skipped (listed in words()); anything printed is a real difference.
# It compares tab names and row labels. Numbers (sizes) and option values come from TradingView's saved
# templates, so they are dropped; bold/italic are icons in TradingView, so "B" / "I" on our side are fine.
import json,sys,re
S=sys.argv[1]
tv=json.load(open(S+'/tv.json'))
M={'trendline':'trend_line','hline':'horizontal_line','ray':'ray','vline':'vertical_line','hray':'horizontal_ray','infoline':'info_line','parallelchannel':'parallel_channel','pitchfork':'pitchfork','pricerange':'price_range','datepricerange':'date_and_price_range','daterange':'date_range','freehand':'brush','arrowmarker':'arrow_marker','arrowmarkup':'arrow_up','arrowmarkdown':'arrow_down','highlighter':'highlighter','box':'rectangle','path':'path','text':'text','anchoredtext':'anchored_text','callout':'callout','note':'note','anchorednote':'anchored_note','emoji':'emoji'}
ALIGN_VALUES = {'Top', 'Middle', 'Bottom', 'Left', 'Center', 'Right', 'Inside', 'Vertical', 'Horizontal'}

def words(t):
    # labels only: drop numbers/px values and option values that depend on saved templates
    parts=[x.strip() for x in re.split(r'\s*\|\s*|\n',t) if x.strip()]
    out = []
    for x in parts:
        if re.fullmatch(r'[\d.]+(px)?', x): continue  # sizes come from saved templates
        if x in ('B', 'I'): continue  # TradingView's bold/italic are icons (no text)
        if x in ALIGN_VALUES: continue  # alignment values come from saved templates
        out.append(x.replace('(price, time)', '(price, bar)').replace('(time)', '(bar)'))  # ours: a date, by choice
    return out
for l in open(S+'/run2.txt'):
    if not l.startswith('{'): continue
    d=json.loads(l); t=tv.get(M[d['tool']])
    if not t or 'tabs' not in t:
        print('REDO', d['tool'], '(TradingView entry missing or an error: rerun tv-read-dialogs.js for it)'); continue
    out=[]
    if d.get('tabs')!=t['tabs']: out.append(f"TABS ours {d.get('tabs')} tv {t['tabs']}")
    for tab in t['tabs']:
        o=words((d.get('rows') or {}).get(tab,'')); v=words(t['rows'].get(tab,''))
        if o!=v: out.append(f"{tab}: ours {o} | tv {v}")
    print(('OK  ' if not out else 'DIFF')+' '+d['tool']); [print('     '+x) for x in out]
