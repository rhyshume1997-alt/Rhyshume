"""Build the Client Workbook with the client meeting module.
   Usage: python3 tools/workbook-meeting/build.py <source workbook html> <output html>
   Source: the workbook as it is on main. The module is added, nothing else in the workbook is rewritten."""
import base64, json, sys, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
if 'CLIENT MEETING: a guided discovery interview' in html: sys.exit('already built')
b64 = lambda f: 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(HERE, 'previews', f), 'rb').read()).decode()
C = json.load(open(os.path.join(HERE, 'concepts.json')))
for c in C: c['d'] = b64(c['slug'] + '-d.jpg'); c['m'] = b64(c['slug'] + '-m.jpg')
js = open(os.path.join(HERE, 'meeting.js'), encoding='utf-8').read().replace('__MEET_CONCEPTS__', json.dumps(C, ensure_ascii=False))
css = open(os.path.join(HERE, 'meeting.css'), encoding='utf-8').read()
def rep(old, new, count=1):
    global html
    if html.count(old) < 1: sys.exit('anchor not found: ' + old[:60])
    html = html.replace(old, new, count)
rep("{ id: 'setup', g: '1 Client', label: 'Client' },", "{ id: 'setup', g: '1 Client', label: 'Client' },\n  { id: 'meeting', g: '1 Client', label: 'Client meeting' },")
rep("biz: vBiz, qpage: vQpage,", "meeting: vMeeting, biz: vBiz, qpage: vQpage,")
rep("function shell() {\n", "function shell() {\n  if (typeof meetEnsure === 'function') { meetEnsure(); if (S.screen === 'meeting' && S.meet.open) return meetShell(); }\n")
rep('<main id="main" tabindex="-1" class="main">${view()}</main>', '<main id="main" tabindex="-1" class="main">${(S.screen === \'setup\' && typeof meetBanner === \'function\') ? meetBanner() : \'\'}${view()}</main>')
rep("function init() { load(); ensurePackState();", "function init() { load(); ensurePackState(); if (typeof meetEnsure === 'function') meetEnsure();")
rep('<div class="topr"><span class="chip revchip"', '<div class="topr"><button class="btn pri meetstart" data-act="mstart">START CLIENT MEETING</button><span class="chip revchip"')
rep('</style></head><body>', css + '\n</style></head><body>')
rep('<script>init();</script>', '<script>' + js + '</script>\n<script>init();</script>')
open(out, 'w', encoding='utf-8').write(html)
print('built', out, round(len(html) / 1e6, 2), 'MB')
