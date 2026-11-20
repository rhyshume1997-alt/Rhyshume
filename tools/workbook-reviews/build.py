"""Build the Client Workbook with the Business reviews module (WP-D). Run AFTER the meeting module build.
   Usage: python3 tools/workbook-reviews/build.py <source workbook html> <output html>
   Source: the workbook as it is on main (it already has the meeting module and the hosted sign in changes).
   The module is added, nothing else in the workbook is rewritten. Each anchor below must match exactly once or the build stops,
   so a change to the workbook cannot silently break the module. Refuses to run twice on the same file.
   Rollback: rebuild from the source with `git show <commit before>:w-82503121e7fdf54e/index.html`. Nothing here touches the sign in."""
import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
if 'BUSINESS REVIEWS: owner view of free reviews' in html: sys.exit('already built')
if 'CLIENT MEETING: a guided discovery interview' not in html: sys.exit('build the meeting module first (tools/workbook-meeting/build.py)')
js = open(os.path.join(HERE, 'reviews.js'), encoding='utf-8').read()
css = open(os.path.join(HERE, 'reviews.css'), encoding='utf-8').read()
def rep(old, new):
    global html
    n = html.count(old)
    if n != 1: sys.exit('anchor must match exactly once (found %d): %s' % (n, old[:70]))
    html = html.replace(old, new, 1)
# 1 nav item, after Client meeting, group 1 Client
rep("{ id: 'meeting', g: '1 Client', label: 'Client meeting' },", "{ id: 'meeting', g: '1 Client', label: 'Client meeting' },\n  { id: 'reviews', g: '1 Client', label: 'Business reviews' },")
# 2 view
rep("meeting: vMeeting, biz: vBiz,", "reviews: vReviews, meeting: vMeeting, biz: vBiz,")
# 3 header button, small, beside START CLIENT MEETING (online only)
rep('data-act="mstart">START CLIENT MEETING</button><span class="chip revchip"', 'data-act="mstart">START CLIENT MEETING</button>${typeof brwHeadBtn === \'function\' ? brwHeadBtn() : \'\'}<span class="chip revchip"')
# 4 reference strip on the Client screen of a draft that began from a review
rep("${(S.screen === 'setup' && typeof meetBanner === 'function') ? meetBanner() : ''}${view()}", "${(S.screen === 'setup' && typeof meetBanner === 'function') ? meetBanner() : ''}${(S.screen === 'setup' && typeof brwBanner === 'function') ? brwBanner() : ''}${view()}")
# 5 gate level screen (client list level), only for CL.screen === 'reviews'
rep("function cloudGate() { if (!CL.on || CL.offline || CL.screen === 'work') return '';", "function cloudGate() { if (!CL.on || CL.offline || CL.screen === 'work') return ''; if (CL.screen === 'reviews' && typeof brwGate === 'function') return brwGate();")
# 6 button on the client list
rep('<button class="btn" data-act="clreload">Refresh the list</button></p>', '<button class="btn" data-act="clreload">Refresh the list</button>${typeof brwListBtn === \'function\' ? brwListBtn() : \'\'}</p>')
# 7 Make into a client: attach the review as a reference before the row is made, record the link after
rep("enquiryPrefill(l); applyDefaults(true);\n    const row = await clCreate(", "enquiryPrefill(l); applyDefaults(true);\n    if (typeof brwAttach === 'function') { try { await brwAttach(l); } catch (e) { } }\n    const row = await clCreate(")
rep("It may show again in the list'; } }\n  },", "It may show again in the list'; } }\n    if (row && typeof brwAfter === 'function') { try { await brwAfter(l, row); } catch (e) { } }\n  },")
# 8 css and script, after the meeting module and before init
# the document's own style block (other copies of this closing text sit inside generated page templates, so the anchor is longer)
rep('</style></head><body><script type="text/plain" id="font-lice', css + '\n</style></head><body><script type="text/plain" id="font-lice')
rep('<script>init();</script>', '<script>' + js + '</script>\n<script>init();</script>')
open(out, 'w', encoding='utf-8').write(html)
print('built', out, round(len(html) / 1e6, 2), 'MB')
