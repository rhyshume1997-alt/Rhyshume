"""Build the Client Workbook with the "Client access" panel (client login with a temporary password).
   Usage: python3 tools/workbook-client-access/build.py <source workbook html> <output html>
   Only insertions are made, no existing line changes. Independent of tools/workbook-meeting and tools/workbook-client-link (the anchors
   exist with or without them). Needs the server routes and the migration to do anything: without them the panel says so honestly."""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
if 'CLIENT ACCESS PANEL: "Client access"' in html: sys.exit('already built')
js = open(os.path.join(HERE, 'access.js'), encoding='utf-8').read()
def rep(old, new):
    global html
    if html.count(old) != 1: sys.exit('anchor not found exactly once: ' + old[:60])
    html = html.replace(old, new, 1)
rep("\n    + sec('3.0', 'Status', '<table class=\"tbl\">", "\n    + (typeof cacPanel === 'function' ? cacPanel() : '')\n    + sec('3.0', 'Status', '<table class=\"tbl\">")
rep('\n/* ---- view as client ---- */\n', '\n' + js.rstrip('\n') + '\n\n/* ---- view as client ---- */\n')
open(out, 'w', encoding='utf-8').write(html)
print('built', out)
