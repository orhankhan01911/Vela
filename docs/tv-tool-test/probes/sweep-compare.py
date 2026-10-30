# Compare our dialogs with TradingView's, tool by tool.
# Usage: python3 sweep-compare.py DIR
#   DIR/tv.json   = the result of tv-read-dialogs.js (JSON.stringify(window.__wkRes)), saved by hand
#   DIR/run2.txt  = the output of sweep-probe.mjs
# It compares tab names and row labels. Numbers (sizes) and option values come from TradingView's saved
# templates, so they are dropped; bold/italic are icons in TradingView, so "B" / "I" on our side are fine.
import json,sys,re
S=sys.argv[1]
tv=json.load(open(S+'/tv.json'))
M={'trendline':'trend_line','hline':'horizontal_line','ray':'ray','vline':'vertical_line','hray':'horizontal_ray','infoline':'info_line','parallelchannel':'parallel_channel','pitchfork':'pitchfork','pricerange':'price_range','datepricerange':'date_and_price_range','daterange':'date_range','freehand':'brush','arrowmarker':'arrow_marker','arrowmarkup':'arrow_up','arrowmarkdown':'arrow_down','highlighter':'highlighter','box':'rectangle','path':'path','text':'text','anchoredtext':'anchored_text','callout':'callout','note':'note','anchorednote':'anchored_note','emoji':'emoji'}
def words(t):
    # labels only: drop numbers/px values and option values that depend on saved templates
    parts=[x.strip() for x in re.split(r'\s*\|\s*|\n',t) if x.strip()]
    return [x for x in parts if not re.fullmatch(r'[\d.]+(px)?',x)]
for l in open(S+'/run2.txt'):
    if not l.startswith('{'): continue
    d=json.loads(l); t=tv[M[d['tool']]]
    out=[]
    if d.get('tabs')!=t['tabs']: out.append(f"TABS ours {d.get('tabs')} tv {t['tabs']}")
    for tab in t['tabs']:
        o=words((d.get('rows') or {}).get(tab,'')); v=words(t['rows'].get(tab,''))
        if o!=v: out.append(f"{tab}: ours {o} | tv {v}")
    print(('OK  ' if not out else 'DIFF')+' '+d['tool']); [print('     '+x) for x in out]
