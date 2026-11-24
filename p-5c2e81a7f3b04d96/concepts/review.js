/* Concept review: concept on the left, "what I like / don't like" panel on the right. Saves in the browser as you go.
   "Download my feedback" makes one file to send back. Nothing is uploaded anywhere. */
(function () {
  'use strict';
  var SEND_TO = ''; /* put an email address here to prefill the "Email it" button, or leave empty */
  var CONCEPTS = {
    'long-pour': { name: 'The Long Pour', signature: 'The glass empties as you scroll', extras: [['Pint behind the whole page', 'The pint photos fixed behind every section']] },
    'wake-jack': { name: 'Wake Jack', signature: 'Wake Jack and he headbutts the page away', extras: [['Sleeping Jack at the top', 'Jack asleep on the counter']] },
    'the-shelves': { name: 'The Shelves', signature: 'Find your drink with taste dials', extras: [['Shelves and ticket-stub cards', 'Shelf rows, round cards, ticket stubs']] },
    'keg-to-bottle': { name: 'Keg to Bottle', signature: 'The beer line fills as you scroll', extras: [['The scroll story', 'Keg, tap, bottle, hamper and door down the page']] },
    'hamper-table': { name: 'The Hamper Table', signature: 'Pack a hamper and write the gift tag', extras: [['Gift-led top of page', 'The hamper on the counter']] },
    'deli-counter': { name: 'The Deli Counter', signature: 'Take a number ticket', extras: [['Menu board and price-tag look', 'Red, green and cream, slab lettering, ticket and tag shapes']] },
    'tap-room': { name: 'The Tap Room', signature: 'Pull the tap handle to pour', extras: [['Tap list (chalkboard) shelf', 'The products shown as a tap list with dials']] },
    'shop-front': { name: 'The Shop Front', signature: 'Illustrated shop door and Open/Closed sign', extras: [['Illustrated shop scene', 'The drawn shop front and shelves']] },
    'hamper-box': { name: 'The Hamper Box', signature: 'Build a hamper with a gift tag', extras: [['Soft, gift-led look', 'Linen, sage and blush, fine lines, lots of space']] },
    'local-pub': { name: 'The Local', signature: "Regulars' stamp card", extras: [['Ledger and noticeboard layout', 'Columns, pinned notices, tartan-style stripes']] }
  };
  var COMMON = [
    ['feel', 'Overall feel', 'Does it feel like Jack O’Beers & Deli?'],
    ['colours', 'Colours', 'The colour mix'],
    ['fonts', 'Lettering and fonts', 'Headings and body text'],
    ['logo', 'The bull logo and how it is used', 'Size, place and the sign it sits on'],
    ['hero', 'The top of the page', 'The first thing you see'],
    ['signature', 'The special idea', ''],
    ['shelf', 'The products', 'How drinks and deli are shown and the Add to basket button'],
    ['hampers', 'Gift hampers', 'How they are shown'],
    ['how', 'How it works picture', 'Choose, pick delivery or collect, pay, enjoy'],
    ['find', 'Find us and opening hours', 'Address, hours, directions'],
    ['words', 'The words and tone', 'Does it sound like you?'],
    ['phone', 'On a phone', 'Switch to Phone view above and have a look']
  ];
  var RATES = [['love', 'Love it'], ['maybe', 'Not sure'], ['dislike', 'Don’t like']];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function key(id) { return 'jo_fb_' + id; }
  function load(id) { try { return JSON.parse(localStorage.getItem(key(id)) || '{}'); } catch (e) { return {}; } }
  function save(id, d) { try { localStorage.setItem(key(id), JSON.stringify(d)); } catch (e) { /* private mode */ } }
  function elements(id) {
    var c = CONCEPTS[id], list = COMMON.map(function (e) { return { id: e[0], label: e[1], hint: e[2] }; });
    list.forEach(function (e) { if (e.id === 'signature') { e.label = 'The special idea: ' + c.signature; e.hint = 'Try it on the left first'; } });
    c.extras.forEach(function (x, i) { list.splice(5 + i, 0, { id: 'extra' + i, label: x[0], hint: x[1] }); });
    return list;
  }
  var LAB = { love: 'Love it', maybe: 'Not sure', dislike: 'Don’t like' };
  function makeText(id, d) {
    var c = CONCEPTS[id], out = [];
    out.push('JACK O’BEERS & DELI: WEBSITE CONCEPT FEEDBACK', 'Concept: ' + c.name, 'Name: ' + (d.who || '(not given)'), 'Date: ' + new Date().toLocaleString('en-GB'), '');
    out.push('Overall score (1 to 5): ' + (d.score || 'not given'), '');
    elements(id).forEach(function (e) { var r = d.r && d.r[e.id]; out.push((e.label + ': ' + (r ? LAB[r] : 'no answer')) + ((d.n && d.n[e.id]) ? '\n   Why: ' + d.n[e.id] : '')); });
    out.push('', 'What I would KEEP: ' + (d.keep || ''), 'What I would CHANGE: ' + (d.change || ''), 'Anything else: ' + (d.other || ''));
    out.push('', '--- data (for the developer, please leave this in) ---', JSON.stringify({ concept: id, saved: new Date().toISOString(), data: d }));
    return out.join('\n');
  }
  function download(name, text) {
    var b = new Blob([text], { type: 'text/plain;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- review page ---------- */
  var isReview = !!$('#pane');
  if (isReview) {
    var id = new URLSearchParams(location.search).get('c');
    if (!CONCEPTS[id]) { document.body.innerHTML = '<p style="padding:2rem">Unknown concept. <a href="index.html">Back to all concepts</a></p>'; return; }
    var c = CONCEPTS[id], d = load(id); d.r = d.r || {}; d.n = d.n || {};
    document.title = 'Review: ' + c.name;
    $('#title').textContent = c.name;
    $('#frame').src = id + '/index.html'; $('#frame').title = c.name + ' concept';
    $('#open').href = id + '/index.html';
    var html = '<h2>What do you think?</h2><p>Tap one for each part. Add a few words if you like. It saves as you go. Takes about 3 minutes.</p>';
    html += '<div class="who"><label class="lbl" for="who">Your name (optional)</label><input type="text" id="who" autocomplete="name" value="' + esc(d.who || '') + '"></div>';
    elements(id).forEach(function (e) {
      html += '<fieldset class="el"><legend>' + esc(e.label) + '</legend>' + (e.hint ? '<p class="hint">' + esc(e.hint) + '</p>' : '') + '<div class="rate" role="radiogroup">';
      RATES.forEach(function (r) { html += '<label><input type="radio" name="r-' + e.id + '" value="' + r[0] + '"' + (d.r[e.id] === r[0] ? ' checked' : '') + '><span>' + r[1] + '</span></label>'; });
      html += '</div><input type="text" class="note" data-note="' + e.id + '" aria-label="Why? (optional) for ' + esc(e.label) + '" placeholder="Why? (optional)" value="' + esc(d.n[e.id] || '') + '"></fieldset>';
    });
    html += '<fieldset class="el"><legend>Overall score for this concept</legend><div class="stars">';
    for (var s = 1; s <= 5; s++) html += '<label><input type="radio" name="score" value="' + s + '"' + (String(d.score) === String(s) ? ' checked' : '') + '><span>' + s + '</span></label>';
    html += '</div><p class="hint">1 = not for us, 5 = this is it</p></fieldset>';
    html += '<div class="el"><label class="lbl" for="keep">What would you KEEP?</label><textarea id="keep">' + esc(d.keep || '') + '</textarea></div>';
    html += '<div class="el"><label class="lbl" for="change">What would you CHANGE?</label><textarea id="change">' + esc(d.change || '') + '</textarea></div>';
    html += '<div class="el"><label class="lbl" for="other">Anything else?</label><textarea id="other">' + esc(d.other || '') + '</textarea></div>';
    html += '<div class="dock"><p class="status" id="status" role="status"></p><div class="row"><button class="btn big" type="button" id="dl">Download my feedback</button><button class="btn ghost" type="button" id="cp">Copy it</button>' + '<a class="btn ghost" id="mail" href="#">Email it</a></div><p style="margin:.2rem 0 0;font-size:.9rem">Download the file, then send it back to us by email.</p></div>';
    $('#pane').innerHTML = html;
    var stat = $('#status'); var t;
    function saved() { stat.textContent = 'Saved on this device'; clearTimeout(t); t = setTimeout(function () { stat.textContent = ''; }, 1800); }
    function commit() { d.who = $('#who').value; d.keep = $('#keep').value; d.change = $('#change').value; d.other = $('#other').value; var sc = document.querySelector('input[name=score]:checked'); d.score = sc ? sc.value : ''; save(id, d); saved(); }
    $('#pane').addEventListener('change', function (e) { var n = e.target.name || ''; if (n.indexOf('r-') === 0) d.r[n.slice(2)] = e.target.value; commit(); });
    $('#pane').addEventListener('input', function (e) { if (e.target.dataset.note) d.n[e.target.dataset.note] = e.target.value; commit(); });
    function fname() { return 'jack-obeers-feedback-' + id + '.txt'; }
    $('#dl').addEventListener('click', function () { commit(); download(fname(), makeText(id, d)); stat.textContent = 'Downloaded. Now send the file back to us.'; });
    $('#cp').addEventListener('click', function () { commit(); var tx = makeText(id, d); if (navigator.clipboard) navigator.clipboard.writeText(tx).then(function () { stat.textContent = 'Copied. Paste it into an email.'; }, function () { stat.textContent = 'Could not copy. Use Download instead.'; }); else stat.textContent = 'Could not copy. Use Download instead.'; });
    $('#mail').addEventListener('click', function (e) { commit(); var tx = makeText(id, d); this.href = 'mailto:' + SEND_TO + '?subject=' + encodeURIComponent('Jack O’Beers concept feedback: ' + c.name) + '&body=' + encodeURIComponent(tx.slice(0, 1800)); });
    /* phone / desktop view */
    var stage = $('#stage'), seg = document.querySelectorAll('.seg button');
    seg.forEach(function (b) { b.addEventListener('click', function () { seg.forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); stage.classList.toggle('phone', b.dataset.v === 'phone'); }); });
    var tg = $('#toggle'), pane = $('#pane');
    tg.addEventListener('click', function () { var o = pane.classList.toggle('open'); tg.textContent = o ? 'Close feedback' : 'Give feedback'; tg.setAttribute('aria-expanded', o); });
  }

  /* ---------- board page ---------- */
  var board = $('#board-cards');
  if (board) {
    Object.keys(CONCEPTS).forEach(function (id) {
      var d = load(id), done = d.score || (d.r && Object.keys(d.r).length);
      var li = document.querySelector('[data-c="' + id + '"] .done'); if (li) li.textContent = done ? 'Your feedback is saved' + (d.score ? ' (score ' + d.score + ')' : '') : '';
    });
    var all = $('#dl-all');
    if (all) all.addEventListener('click', function () {
      var parts = ['JACK O’BEERS & DELI: ALL CONCEPT FEEDBACK', 'Date: ' + new Date().toLocaleString('en-GB'), ''];
      var any = false; Object.keys(CONCEPTS).forEach(function (id) { var d = load(id); if (d.score || (d.r && Object.keys(d.r).length) || d.keep || d.change) { any = true; parts.push('==============================', makeText(id, d), ''); } });
      var fav = $('#fav'); if (fav && fav.value) parts.unshift('MY FAVOURITE OVERALL: ' + CONCEPTS[fav.value].name, '');
      var mix = $('#mix'); if (mix && mix.value) parts.push('MIX AND MATCH NOTES: ' + mix.value);
      if (!any && !(fav && fav.value)) { $('#all-status').textContent = 'Nothing saved yet. Open a concept and give some feedback first.'; return; }
      download('jack-obeers-all-feedback.txt', parts.join('\n')); $('#all-status').textContent = 'Downloaded. Now send the file back to us.';
    });
  }
})();
