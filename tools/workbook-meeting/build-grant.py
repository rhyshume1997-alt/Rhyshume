"""Add the grant meeting module to the Client Workbook that is already on main (it already holds the client meeting).
   Usage: python3 tools/workbook-meeting/build-grant.py <source workbook html> <output html>
   Only adds. Every anchor below keeps the original text and puts new text beside it, nothing is removed or rewritten.
   The hosted sign in (no offline button, ?offline ignored) is already in the source and is not touched."""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
if 'GRANT MEETING: a guided one-question-at-a-time meeting' in html: sys.exit('already built')
if 'CLIENT MEETING: a guided discovery interview' not in html: sys.exit('the client meeting module is not in the source')
js = open(os.path.join(HERE, 'grant-meeting.js'), encoding='utf-8').read()
css = open(os.path.join(HERE, 'grant-meeting.css'), encoding='utf-8').read()
def rep(old, new, first=False):
    if html.count(old) != 1 and not (first and html.count(old) > 1): sys.exit('anchor must appear exactly once (%d): %s' % (html.count(old), old[:70]))
    return html.replace(old, new, 1)
html = rep("  { id: 'open', g: 'Grant', label: 'Grant basics', w: 'fund' },", "  { id: 'gmeeting', g: 'Grant', label: 'Grant meeting', w: 'fund' },\n  { id: 'open', g: 'Grant', label: 'Grant basics', w: 'fund' },")
html = rep("meeting: vMeeting, biz: vBiz,", "meeting: vMeeting, gmeeting: vGMeeting, biz: vBiz,")
html = rep("if (S.screen === 'meeting' && S.meet.open) return meetShell(); }\n", "if (S.screen === 'meeting' && S.meet.open) return meetShell(); }\n  if (typeof gmEnsure === 'function') { gmEnsure(); if ((S.screen === 'meeting' || S.screen === 'gmeeting') && S.gmeet.open) return gmShell(); }\n")
html = rep('</style></head><body>', css + '\n</style></head><body>', first=True)
html = rep('<script>init();</script>', '<script>' + js + '</script>\n<script>init();</script>')
open(out, 'w', encoding='utf-8').write(html)
print('built', out, round(len(html) / 1e6, 2), 'MB')
