"""Build the Client Workbook with the "Email the link" action.
   Usage: python3 tools/workbook-client-link/build.py <source workbook html> <output html>
   Source: the workbook as it is on main (or with other modules already built in). Only insertions are made, no existing line changes.
   Independent of tools/workbook-meeting and of any database migration."""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
if 'CLIENT LINK EMAIL: "Email the link"' in html: sys.exit('already built')
js = open(os.path.join(HERE, 'link-email.js'), encoding='utf-8').read()
def rep(old, new):
    global html
    if html.count(old) != 1: sys.exit('anchor not found exactly once: ' + old[:60])
    html = html.replace(old, new, 1)
# a whole new line in the Client link view, before the Status section
rep("\n    + sec('3.0', 'Status', '<table class=\"tbl\">", "\n    + (typeof clmPanel === 'function' ? clmPanel() : '')\n    + sec('3.0', 'Status', '<table class=\"tbl\">")
# the module goes into the main script as whole new lines, just before the "view as client" block (after the portal code it uses)
rep('\n/* ---- view as client ---- */\n', '\n' + js.rstrip('\n') + '\n\n/* ---- view as client ---- */\n')
open(out, 'w', encoding='utf-8').write(html)
print('built', out)
