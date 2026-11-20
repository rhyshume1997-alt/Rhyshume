/* DEV ONLY (not shipped). Extra API integration checks: the eight task chips, held report email released by the owner (BR_REQUIRE_APPROVAL=1). */
'use strict';
const { createHarness } = require('./harness');
const A = require('./api');
const res = []; const check = (n, c, x) => { res.push(c); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + (x || ''))); };
(async () => {
  const H = createHarness({ env: { BR_REQUIRE_APPROVAL: '1' } }); const p = await H.start(0, 80); A.setBase('http://localhost:' + p.port);
  const get = (t) => fetch('http://localhost:' + p.port + '/__harness/data?table=' + t).then((r) => r.json());
  try {
    const chips = ['We spend too long replying to new enquiries', 'We send quotes but forget to chase them', 'We forget to follow up potential customers', 'We spend time updating customers on their jobs', 'We copy information into spreadsheets by hand', 'We spend hours preparing reports', 'We move information between systems by hand', 'We manage documents and approvals by email'];
    const s = await A.start({ website: undefined }); const id = s.json.review.id, t = s.json.access_token;
    await A.call('POST', '/api/business-review/' + id + '/confirm', { confirmed: true }, { token: t }); await A.runToReady(id, t);
    const out = [];
    for (const c of chips) { const r = await A.call('POST', '/api/business-review/' + id + '/automation', { task: c }, { token: t }); out.push(c.slice(0, 34) + ' -> ' + (r.json.automation_opportunity ? r.json.automation_opportunity.category_key + ' / ' + r.json.automation_opportunity.workflow_title : r.status + ' ' + r.raw.slice(0, 80))); }
    console.log(out.join('\n'));
    check('all 8 task chips map to a category (none unmatched or erroring)', out.every((o) => !/ -> (4|5)\d\d|undefined|null/.test(o)));
    // held email
    const r = await A.call('POST', '/api/business-review/' + id + '/request-report', { email: 'visitor@example.test', consent: { report_delivery: true, follow_up_contact: false, marketing: false }, turnstile_token: 'TEST-TOKEN-business-review-mail' }, { token: t });
    check('with BR_REQUIRE_APPROVAL=1 the request is held, 202, nothing sent', r.status === 202 && r.json.delivery.status === 'held_for_approval' && H.state.mails.length === 0, r.status + ' ' + r.raw);
    const dl = (await get('br_deliveries'))[0]; const rv = await get('br_report_versions');
    check('no token stored in clear: sealed link present, not equal to token', !JSON.stringify(await get('br_reviews')).includes(t));
    const early = await A.call('POST', '/api/business-review/admin/reviews/' + id + '/deliveries/' + dl.id + '/send', {}, { token: 'owner-session' });
    check('owner cannot send before approving the report version (409 wrong_state)', early.status === 409, early.status + ' ' + early.raw.slice(0, 100));
    const latest = rv.sort((a, b) => b.version - a.version)[0].version;
    const ap = await A.call('POST', '/api/business-review/admin/reviews/' + id + '/reports/' + latest + '/approve', {}, { token: 'owner-session' }); check('approve latest version 200', ap.status === 200, ap.raw);
    const dl2 = (await get('br_deliveries'))[0];
    const late = await A.call('POST', '/api/business-review/admin/reviews/' + id + '/deliveries/' + dl.id + '/send', {}, { token: 'owner-session' });
    check('after approval the owner send releases the held email (200)', late.status === 200 && H.state.mails.length === 1, late.status + ' ' + late.raw.slice(0, 150) + ' report_version_id ' + dl2.report_version_id + ' latest ' + latest);
    if (H.state.mails[0]) check('released email carries a working tokenised link and went only to the typed address', /#t=[A-Za-z0-9_-]{30,}&id=/.test(H.state.mails[0].text) && H.state.mails[0].to.join() === 'visitor@example.test');
    const after = JSON.stringify(await get('br_reviews')); check('sealed link removed after sending', !/sealed_links":\{"[0-9a-f-]{36}"/.test(after));
  } catch (e) { check('exception ' + e.stack, false); } finally { await H.close(); }
  console.log(res.filter(Boolean).length + ' passed, ' + res.filter((x) => !x).length + ' failed');
})();
