'use strict';
/*
Business review: the lead relationship (br_prospects) and the leads row the workbook already lists.
Inputs : a review row, contact details the visitor chose to give, their separate consent flags.
Outputs: one prospect per review and at most one leads row per review (a second request updates, never duplicates).
Rules  : report delivery consent, follow up consent and marketing consent are separate booleans; marketing is only true when explicitly
         ticked and nothing in this system sends marketing; the leads row is only created when follow up consent is given; a handled
         lead is never edited; deleting a review clears contact data. Never auto converts to a client project and never makes a quote.
Must not change: separation of consents, one lead per review, no overwrite of a handled lead.
*/
const CONSENT_TEXT_VERSION = 'br-consent-1';

async function upsertProspect(deps, review, d) {
  const store = deps.store;
  const nowIso = (deps.now ? deps.now() : new Date()).toISOString();
  const existing = (await store.select('br_prospects', { review_id: review.id }, { limit: 1 }))[0];
  const fields = {
    contact_name: d.name || null, email: d.email, phone: d.phone || null, message: d.message || null,
    follow_up_consent: existing && existing.follow_up_consent ? true : !!d.consent.follow_up_contact,
    marketing_consent: !!d.consent.marketing, consent_text_version: CONSENT_TEXT_VERSION, consent_at: nowIso
  };
  if (d.services && d.services.length) fields.requested_services = d.services;
  let prospect;
  if (existing) prospect = (await store.update('br_prospects', { review_id: review.id }, fields))[0];
  else prospect = await store.insert('br_prospects', Object.assign({ review_id: review.id, status: 'new' }, fields));
  if (d.consent.follow_up_contact) {
    const leadRow = { name: d.name || '', business: review.business_name, email: d.email, phone: d.phone || '', message: '[' + review.ref + '] ' + (d.message || 'Business review follow up request.'), picks: {}, consent: true };
    if (prospect.lead_id) {
      const lead = (await store.select('leads', { id: prospect.lead_id }, { limit: 1 }))[0];
      if (lead && !lead.handled) await store.update('leads', { id: lead.id }, leadRow);
    } else {
      const lead = await store.insert('leads', leadRow);
      prospect = (await store.update('br_prospects', { review_id: review.id }, { lead_id: lead.id }))[0];
    }
  }
  return prospect;
}

async function clearContact(deps, review) {
  const store = deps.store;
  await store.update('br_deliveries', { review_id: review.id }, { to_email: null }).catch(function () { return []; });
  const p = (await store.select('br_prospects', { review_id: review.id }, { limit: 1 }))[0];
  if (p) {
    if (p.lead_id) {
      const lead = (await store.select('leads', { id: p.lead_id }, { limit: 1 }))[0];
      if (lead && !lead.handled) await store.delete('leads', { id: lead.id });
    }
    await store.update('br_prospects', { review_id: review.id }, { contact_name: null, email: null, phone: null, message: null, follow_up_consent: false, marketing_consent: false, lead_id: null });
  }
}

module.exports = { upsertProspect, clearContact, CONSENT_TEXT_VERSION };
