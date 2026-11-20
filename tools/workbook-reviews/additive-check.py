"""Proof that the Business reviews build is purely additive.
   Usage: python3 tools/workbook-reviews/additive-check.py <source workbook html> <built workbook html> [--show]
   Inputs : the workbook before the module, and after the build. Outputs: exit 0 and a summary when every difference is an insertion
   (nothing in the original was removed or changed); exit 1 and the first offending change otherwise.
   Must not change: it only reads. Line level first, then character level inside any line that differs."""
import difflib, sys
a = open(sys.argv[1], encoding='utf-8').read().split('\n'); b = open(sys.argv[2], encoding='utf-8').read().split('\n')
show = '--show' in sys.argv
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
ins_lines = 0; changed = []; bad = None; ins_chars = 0
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'equal': continue
    if tag == 'insert': ins_lines += j2 - j1; ins_chars += sum(len(x) + 1 for x in b[j1:j2]); continue
    if tag == 'delete': bad = ('whole lines removed', a[i1][:80]); break
    old, new = '\n'.join(a[i1:i2]), '\n'.join(b[j1:j2])
    cs = difflib.SequenceMatcher(None, old, new, autojunk=False)
    for t, x1, x2, y1, y2 in cs.get_opcodes():
        if t in ('delete', 'replace'): bad = ('original text changed', old[max(0, x1 - 30):x2 + 30]); break
        if t == 'insert': ins_chars += y2 - y1
    if bad: break
    changed.append((i1 + 1, i2, j1 + 1, j2, len(new) - len(old)))
if bad: print('NOT ADDITIVE:', bad); sys.exit(1)
print('ADDITIVE: every difference is an insertion. original lines %d, built lines %d, inserted whole lines %d, existing lines extended in place %d, characters inserted %d' % (len(a), len(b), ins_lines, len(changed), ins_chars))
for c in changed: print('  existing line(s) %d-%d now %d-%d, +%d characters' % c)
