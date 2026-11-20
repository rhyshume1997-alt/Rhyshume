"""Build the client LOGIN page (client/index.html) from the existing token page (c-09b37e50c043baaa/index.html).
   Usage: python3 tools/client-access-page/build.py [source html] [output html]   (defaults: the token page, client/index.html)
   The client's view is the existing page's own code, so it cannot drift: this script only swaps the transport (token rpc calls become
   signed in client_* calls), removes view-as-client mode and the token-only video call, adds a sign out button, and puts the login and forced
   password change in front. The token page itself is never modified. Every replacement must match exactly once or the build stops."""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'c-09b37e50c043baaa', 'index.html')
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'client', 'index.html')
h = open(src, encoding='utf-8').read()
def rep(old, new):
    global h
    if h.count(old) != 1: sys.exit('anchor not found exactly once (%d): %s' % (h.count(old), old[:70]))
    h = h.replace(old, new, 1)
# 1. transport: session based rpc, token arguments dropped, function names mapped
i = h.index('  function rpc(fn, args) {'); j = h.index('  /* ---- views ---- */')
h = h[:i] + """  var CMAP = { portal_open: 'client_open', portal_quote: 'client_quote', portal_quote_accept: 'client_quote_accept' };
  function rpc(fn, args) { var a = Object.assign({}, args); delete a.p_token; return window.CA.rpc(CMAP[fn] || fn, a); }

""" + h[j:]
rep("var body = JSON.stringify({ p_token: P.token, p_answers: outAnswers(), p_submit: !!submit });", "var body = JSON.stringify({ p_answers: outAnswers(), p_submit: !!submit });")
rep("fetch(SB + '/rest/v1/rpc/portal_save', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: body })", "fetch(SB + '/rest/v1/rpc/client_save', { method: 'POST', headers: window.CA.headers(), body: body })")
# 2. no token in the address, no view-as-client mode, no token-only video call
rep("location.pathname + '#t=' + P.token + '&q=' + P.q.id", "location.pathname + '#q=' + P.q.id")
rep("if (h === 'view') {", "if (false) {")
rep("""var m = /(?:^|&)t=([0-9a-f]{48})(?:&|$)/.exec(h);
    if (!m) { bigMsg('This link is not working', 'It may be incomplete or switched off. Please ask Rhys to send it again'); return; }
    P.token = m[1]; var qm""", """P.token = 'signed-in'; var qm""")
rep("rpc('portal_open', { p_token: P.token }).then(function (r) {\n      if (!r) { bigMsg('This link is not working', 'It may be incomplete or switched off. Please ask Rhys to send it again'); return; }", "rpc('portal_open', {}).then(function (r) {\n      if (!r) { bigMsg('This is not working', 'Please sign in again, or ask Rhys'); return; }")
k = h.index("      fetch(SB + '/functions/v1/portal-videos'"); k2 = h.index("\n", k)
h = h[:k] + "      /* videos are token only in the live system, so they are not shown on the login page yet */" + h[k2:]
# 3. sign out button in the header, login in front of start()
rep("<h1>' + (P.name ? 'For ' + esc(P.name) : 'Your page') + '</h1></header>", "<h1>' + (P.name ? 'For ' + esc(P.name) : 'Your page') + '</h1><p class=\"noprint\" style=\"margin:8px 0 0\"><button type=\"button\" class=\"btn sm\" data-ca=\"signout\">Sign out</button></p></header>")
rep("  start();\n})();", "  window.CA.ready(start);\n})();")
# 4. page head: title, CSP (adds same-origin API and the Turnstile widget only), extra style
rep("<title>Your page</title>", "<title>Sign in | Rhys Hume</title>")
rep("connect-src https://vkpdrqkwxkokolphmkbh.supabase.co; base-uri 'none'; form-action 'none'", "connect-src 'self' https://vkpdrqkwxkokolphmkbh.supabase.co; frame-src https://challenges.cloudflare.com; base-uri 'none'; form-action 'none'")
rep("script-src 'unsafe-inline';", "script-src 'unsafe-inline' https://challenges.cloudflare.com;")
rep("</style></head>", "input[type=password]{width:100%;font:400 16px 'IBM Plex Sans',sans-serif;color:var(--ink);background:var(--paper);border:1px solid var(--ink);border-radius:0;padding:11px 12px;min-height:46px}\n.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n</style></head>")
common = re.search(r"const COMMON = \(([\s\S]*?)\)\.split\(','\);", open(os.path.join(ROOT, 'api', '_lib', 'client-password.js')).read()).group(1)
words = sorted(set(''.join(re.findall(r"'([^']*)'", common)).split(',')))
auth = open(os.path.join(HERE, 'client-auth.js'), encoding='utf-8').read().replace('__COMMON__', json.dumps(words))
rep("<script>(function () {\n  'use strict';\n  var SB =", "<script>" + auth + "</script>\n<script>(function () {\n  'use strict';\n  var SB =")
os.makedirs(os.path.dirname(out), exist_ok=True); open(out, 'w', encoding='utf-8').write(h); print('built', out, round(len(h) / 1e3), 'KB')
