# Flat hand-drawn style illustrations for the "how it works" rows. Colours come from CSS classes (site.css, .il).
def _svg(inner):
    return f'<svg class="il" viewBox="0 0 160 120" aria-hidden="true" focusable="false"><ellipse class="sh" cx="80" cy="110" rx="56" ry="6"/>{inner}</svg>'

ILLU = {
"basket": _svg('''<path class="hd" d="M46 62 a34 34 0 0 1 68 0"/>
<rect class="bot" x="58" y="20" width="20" height="54" rx="7"/><rect class="bot" x="63" y="8" width="10" height="16" rx="3"/><rect class="lab" x="58" y="44" width="20" height="14"/><path class="cap" d="M62 8 h12"/>
<path class="chz" d="M86 60 l38 -12 v26 h-38z"/><circle class="hole" cx="102" cy="64" r="3.2"/><circle class="hole" cx="114" cy="58" r="2.4"/>
<path class="bsk" d="M32 64 h96 l-10 40 a8 8 0 0 1 -8 6 h-60 a8 8 0 0 1 -8 -6z"/><path class="wv" d="M42 80 h76 M47 94 h66 M62 64 v46 M80 64 v46 M98 64 v46"/>'''),
"calendar": _svg('''<rect class="cal" x="30" y="22" width="92" height="82" rx="14"/><path class="calh" d="M30 36 a14 14 0 0 1 14 -14 h64 a14 14 0 0 1 14 14 v12 h-92z"/>
<rect class="ring" x="48" y="12" width="9" height="20" rx="4.5"/><rect class="ring" x="95" y="12" width="9" height="20" rx="4.5"/>
<g class="dots"><circle cx="48" cy="64" r="3"/><circle cx="66" cy="64" r="3"/><circle cx="84" cy="64" r="3"/><circle cx="102" cy="64" r="3"/><circle cx="48" cy="82" r="3"/><circle cx="66" cy="82" r="3"/><circle cx="102" cy="82" r="3"/><circle cx="48" cy="98" r="3"/><circle cx="66" cy="98" r="3"/></g>
<circle class="pick" cx="84" cy="82" r="9"/><path class="tick" d="M79 82 l4 4 l8 -9"/>
<circle class="clk" cx="124" cy="92" r="20"/><path class="hand" d="M124 92 v-11 M124 92 l8 5"/>'''),
"card": _svg('''<rect class="crd" x="20" y="28" width="112" height="70" rx="12" transform="rotate(-6 76 63)"/><rect class="stripe" x="20" y="44" width="112" height="14" transform="rotate(-6 76 63)"/>
<rect class="chip" x="32" y="68" width="22" height="16" rx="4" transform="rotate(-6 76 63)"/><path class="tx" d="M64 78 h50 M64 88 h30" transform="rotate(-6 76 63)"/>
<rect class="lock" x="100" y="62" width="40" height="36" rx="9"/><path class="shackle" d="M108 62 v-8 a12 12 0 0 1 24 0 v8"/><circle class="keyh" cx="120" cy="78" r="4.5"/><path class="keyl" d="M120 82 v8"/>'''),
"shop": _svg('''<path class="awn" d="M24 40 h112 l8 24 H16z"/><g class="stripes"><path d="M40 40 h16 l-3 24 h-18z M72 40 h16 l-1 24 h-18z M104 40 h16 l5 24 h-18z"/></g>
<rect class="wall" x="26" y="64" width="108" height="42"/><rect class="door" x="96" y="72" width="26" height="34" rx="13"/><rect class="winw" x="38" y="72" width="44" height="22" rx="6"/>
<path class="bag" d="M44 96 h30 l-3 14 h-24z"/><path class="bagh" d="M52 96 a7 7 0 0 1 14 0"/><circle class="knob" cx="116" cy="90" r="2"/>'''),
"box": _svg('''<path class="boxb" d="M36 48 l44 -20 l44 20 v46 l-44 20 l-44 -20z"/><path class="boxt" d="M36 48 l44 20 l44 -20 l-44 -20z"/><path class="tape" d="M80 28 v8 l-14 6 M80 68 v46 M80 68 l44 -20"/>
<rect class="lbl" x="92" y="76" width="26" height="18" rx="3" transform="rotate(-18 105 85)"/><path class="tick2" d="M96 85 l4 4 l8 -9" transform="rotate(-18 105 85)"/>'''),
"van": _svg('''<path class="vanb" d="M18 44 h72 v50 h-72z"/><path class="vanc" d="M90 56 h26 l16 18 v20 h-42z"/><path class="vanw" d="M98 62 h14 l10 12 h-24z"/>
<circle class="wh" cx="42" cy="96" r="12"/><circle class="wh" cx="112" cy="96" r="12"/><circle class="hub" cx="42" cy="96" r="4.5"/><circle class="hub" cx="112" cy="96" r="4.5"/>
<path class="logo" d="M34 58 h40 M34 70 h28"/><path class="speed" d="M4 60 h10 M0 72 h12 M6 84 h8"/>'''),
"id": _svg('''<rect class="crd2" x="22" y="30" width="116" height="70" rx="12"/><circle class="face" cx="56" cy="58" r="12"/><path class="body" d="M36 90 a20 18 0 0 1 40 0z"/>
<path class="tx" d="M88 52 h36 M88 66 h30 M88 80 h20"/><circle class="ok" cx="122" cy="88" r="14"/><path class="tick" d="M115 88 l5 5 l10 -11"/>'''),
"glass": _svg('''<path class="gl" d="M46 18 h68 l-8 80 a10 10 0 0 1 -10 9 h-32 a10 10 0 0 1 -10 -9z"/><path class="beer" d="M50 40 h60 l-6 58 a8 8 0 0 1 -8 7 h-32 a8 8 0 0 1 -8 -7z"/>
<path class="foam" d="M46 18 h68 l-2 24 a10 10 0 0 1 -12 4 a10 10 0 0 1 -14 2 a10 10 0 0 1 -14 -2 a10 10 0 0 1 -14 -2 a10 10 0 0 1 -12 -4z"/>
<g class="bub"><circle cx="70" cy="86" r="2.6"/><circle cx="88" cy="74" r="2"/><circle cx="96" cy="92" r="2.8"/><circle cx="78" cy="62" r="1.8"/></g><path class="shine" d="M54 52 v38"/>'''),
}

def process(steps, cls=""):
    """steps: list of (illustration key, title, text). Renders a numbered illustrated row."""
    lis = "".join(f'<li class="rv"><div class="ill">{ILLU[k]}</div><span class="n">0{i}</span><h3>{t}</h3><p>{d}</p></li>' for i, (k, t, d) in enumerate(steps, 1))
    return f'<ol class="process {cls}" style="list-style:none">{lis}</ol>'
