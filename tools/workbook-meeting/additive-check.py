"""Prove a rebuilt workbook only ADDS to the original.
   Usage: python3 tools/workbook-meeting/additive-check.py <original html> <rebuilt html>
   Passes only if the original is a character-for-character subsequence of the rebuilt file, that is, the rebuilt file is the
   original with text inserted and nothing deleted or changed. Also lists every insertion point (line number and size)."""
import sys, difflib
a = open(sys.argv[1], encoding='utf-8').read(); b = open(sys.argv[2], encoding='utf-8').read()
# 1. line level picture
al, bl = a.split('\n'), b.split('\n')
sm = difflib.SequenceMatcher(None, al, bl, autojunk=False)
ins = []; bad = []
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'equal': continue
    if tag == 'insert': ins.append(('lines', j1 + 1, sum(len(x) + 1 for x in bl[j1:j2]))); continue
    # replace or delete: allowed only if every old line is a subsequence of the new text in that block (text added inside the line)
    old = '\n'.join(al[i1:i2]); new = '\n'.join(bl[j1:j2]); it = iter(new)
    if tag == 'replace' and all(c in it for c in old): ins.append(('inside line', j1 + 1, len(new) - len(old)))
    else: bad.append((tag, i1 + 1, old[:80]))
# 2. whole file, character level
pos = 0; ok = True
for chunk_start in range(0, len(a), 4096):
    for ch in a[chunk_start:chunk_start + 4096]:
        pos = b.find(ch, pos)
        if pos < 0: ok = False; break
        pos += 1
    if not ok: break
print('original chars:', len(a), 'rebuilt chars:', len(b), 'added chars:', len(b) - len(a))
for t, ln, n in ins: print('  insertion %-11s at rebuilt line %-5d %d chars' % (t, ln, n))
if bad: print('LINE LEVEL PROBLEMS:', bad)
print('ADDITIVE' if ok and not bad else 'NOT ADDITIVE')
sys.exit(0 if ok and not bad else 1)
