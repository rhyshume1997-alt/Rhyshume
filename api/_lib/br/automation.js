'use strict';
/*
Business review: automation opportunity mapper (CONTRACT section 12). Deterministic phrase table, no model calls.
Inputs : the task the visitor typed (up to 600 chars). Outputs: one opportunity object describing a POTENTIAL workflow.
Rules  : never claims knowledge of their software, process, time or money savings; always says it is a potential workflow and
         not an existing implementation; lists integrations likely needed, approval points and unknowns; confidence is low unless
         several phrases match; "other" returns a generic "needs a conversation" opportunity; legal notes say "Not yet checked".
Must not change: the no savings rule, the "potential workflow" wording, the unknowns list.
*/
const NOT_INCLUDED = 'This is a potential workflow, not an existing implementation at your business. The free review does not include development. Implementation is quoted separately.';
const UNKNOWNS = ['Your current software', 'How the work is done today', 'How much time this takes now'];
const MESSAGING_NOTE = 'Any customer messaging must be checked for consent and opt out rules before use. Not yet checked.';
const GENERAL_NOTE = 'Data protection and any rules that apply to your sector have not been checked for this workflow. Not yet checked.';

const SERVICE = { key: 'automation', label: 'Business process automation', cta: { label: 'Discuss an automation', href: '/automation' } };

const CATS = [
  { key: 'quote_follow_up', title: 'Quotation follow up workflow',
    phrases: [['quotes', /\b(quote|quotes|quotation|quotations|estimate|estimates|proposal|proposals)\b/i], ['chasing', /\b(chase|chasing|chased|follow(?:ing)?[ -]?up|forget|forgot|remind|reminder|no reply|hear back|heard back)\b/i]],
    description: 'A possible workflow in which each quote is recorded with a date and status, a follow up is prepared when no reply has been recorded by the agreed date, and further follow ups stop when the quote is accepted, declined or closed.',
    stages: ['Quote issued and recorded with a date and status', 'Follow up due date reached with no response', 'Follow up prepared (or sent under agreed rules) for a person to approve', 'Stops when accepted, declined or closed', 'Communication history visible on the quote'],
    integrations: ['Where quotes are created today', 'Email or messaging used with customers'],
    approvals: ['A person approves wording and timing rules before anything is sent'], legal: MESSAGING_NOTE, demo: { key: 'quote_follow_up', href: '/automation-demos#quote-follow-up' } },
  { key: 'enquiry_management', title: 'Enquiry management workflow',
    phrases: [['enquiries', /\b(enquir(?:y|ies)|inquir(?:y|ies)|new leads?|leads?)\b/i], ['getting lost', /\b(lost|miss(?:ed|ing)?|slip|slipping|forget|forgot|buried|overlooked)\b/i], ['channels', /\b(website form|web form|contact form|inbox|emails?|phone calls?|messages?|whatsapp|facebook)\b/i], ['replying', /\b(repl(?:y|ying)|respond|responding|answer(?:ing)?)\b/i], ['potential customers', /\b(potential (?:customers?|clients?)|prospects?)\b/i]],
    description: 'A possible workflow in which enquiries from your website form and an authorised inbox create structured records, each enquiry has an owner and a status, outstanding enquiries can be reviewed in one place, and follow ups are drafted or sent under agreed rules.',
    stages: ['Enquiry arrives by form or an authorised inbox and becomes a structured record', 'Enquiry assigned to a person with a status', 'Outstanding enquiries reviewed in one place', 'Follow up drafted (or sent under agreed rules) for a person to approve', 'Status and history kept on the record'],
    integrations: ['Website forms', 'The inbox or inboxes used for enquiries', 'Where jobs or customers are recorded today'],
    approvals: ['A person approves reply wording and rules before anything is sent', 'A person decides how enquiries are assigned'], legal: MESSAGING_NOTE, demo: { key: 'enquiry_to_job', href: '/automation-demos#enquiry-to-job' } },
  { key: 'customer_updates', title: 'Customer job update workflow',
    phrases: [['updates', /\b(updat(?:e|es|ing)|keep(?:ing)? (?:customers?|clients?) (?:informed|posted)|progress|status)\b/i], ['customers', /\b(customers?|clients?)\b/i], ['jobs', /\b(jobs?|orders?|projects?|work in progress|where is my)\b/i]],
    description: 'A possible workflow in which a change of job status prepares an update for the customer, a person approves wording where needed, and each update is recorded against the job.',
    stages: ['Job status changes on the job record', 'Update to the customer prepared from agreed wording', 'A person approves or the rule sends under agreed limits', 'Update recorded against the job'],
    integrations: ['Where jobs are tracked today', 'Email or messaging used with customers'],
    approvals: ['A person approves the wording and which status changes trigger an update'], legal: MESSAGING_NOTE, demo: { key: 'enquiry_to_job', href: '/automation-demos#enquiry-to-job' } },
  { key: 'data_entry_copying', title: 'Data entry and spreadsheet workflow',
    phrases: [['spreadsheets', /\b(spreadsheets?|excel|google sheets?|sheets?)\b/i], ['copying', /\b(cop(?:y|ying|ied)|paste|pasting|re-?typ(?:e|ing)|re-?enter|re-?entering|retyp(?:e|ing)|manual(?:ly)? (?:entry|enter|input)|typing (?:in|up)|data entry|key(?:ing)? in)\b/i], ['same information twice', /\b(twice|again|duplicate|double)\b/i]],
    description: 'A possible workflow in which information is captured once in a structured form and carried to the places that need it, with checks for missing or inconsistent entries and a record of what was changed.',
    stages: ['Information captured once in a structured form', 'Checks for missing or inconsistent entries', 'Information passed to the spreadsheet or system that needs it', 'Changes recorded so they can be reviewed'],
    integrations: ['The spreadsheets or systems the information is copied between today'],
    approvals: ['A person agrees which fields are copied and which checks apply'], legal: GENERAL_NOTE, demo: null },
  { key: 'reporting', title: 'Reporting workflow',
    phrases: [['reports', /\b(reports?|reporting|dashboards?|figures|statistics|stats|summary|summaries|kpis?)\b/i], ['regular', /\b(weekly|monthly|daily|every week|every month|each week|each month)\b/i], ['preparing', /\b(prepar(?:e|ing)|compil(?:e|ing)|put(?:ting)? together|build(?:ing)?|produc(?:e|ing))\b/i]],
    description: 'A possible workflow in which the information a report needs is gathered from where it is recorded, assembled in an agreed layout on a schedule, and checked by a person before it is used.',
    stages: ['Source information identified and gathered', 'Report assembled in an agreed layout on a schedule', 'A person checks the report', 'Report stored with the date and the data used'],
    integrations: ['The systems or files that hold the source information'],
    approvals: ['A person checks each report before it is shared'], legal: GENERAL_NOTE, demo: null },
  { key: 'system_sync', title: 'System to system information flow',
    phrases: [['between systems', /\b(between (?:two |the |our )?(?:systems?|programs?|packages?|apps?|tools?)|two systems|different systems|disconnected systems|separate systems)\b/i], ['moving information', /\b(mov(?:e|ing) (?:information|data)|transfer(?:ring)?|sync(?:ing|hronis(?:e|ing))?|import(?:ing)?|export(?:ing)?|integrat(?:e|ion|ing))\b/i], ['software', /\b(software|accounts? package|crm|xero|quickbooks|sage|system)\b/i]],
    description: 'A possible workflow in which information is passed between two systems on agreed events, with logging of what moved and a way to see and correct failures.',
    stages: ['An event in the first system is detected', 'Information is checked and mapped to the second system', 'Information is passed on and the result logged', 'Failures are listed for a person to review'],
    integrations: ['Both systems, and whether each offers a supported way to connect'],
    approvals: ['A person agrees which information moves and what happens when a record fails'], legal: GENERAL_NOTE, demo: null },
  { key: 'document_approvals', title: 'Document approval workflow',
    phrases: [['approvals', /\b(approv(?:e|al|als|ing)|sign[ -]?off|authoris(?:e|ation)|authoriz(?:e|ation))\b/i], ['documents', /\b(documents?|procedures?|sops?|drawings?|specifications?|policies|policy|contracts?)\b/i], ['revisions', /\b(revisions?|versions?|review(?:ing)?|issue|issued|controlled)\b/i]],
    description: 'A possible workflow in which a document is submitted for review, assigned to approvers, kept with its revision history, and recorded with an audit trail of who did what and when.',
    stages: ['Document submitted for review', 'Approvers assigned and notified', 'Comments, revisions and decisions recorded', 'Approved version issued with its history and an audit trail'],
    integrations: ['Where documents are stored today', 'How people are notified'],
    approvals: ['Named approvers and the approval rules are agreed before use'], legal: GENERAL_NOTE, demo: { key: 'document_approval', href: '/automation-demos#document-approval' } }
];

const OTHER = { key: 'other', title: 'A workflow that needs a conversation', description: 'The task you described does not clearly match one of the common workflows, so it needs a short conversation to understand what happens today and what a possible workflow could look like.',
  stages: ['Understand what triggers the task and who does it today', 'Agree what a possible workflow would record and check', 'Agree where a person approves before anything is sent or changed'], integrations: ['To be agreed after a conversation'], approvals: ['To be agreed after a conversation'], legal: GENERAL_NOTE, demo: null };

function mapTask(taskText) {
  const text = String(taskText || '').trim().slice(0, 600);
  let best = null;
  CATS.forEach(function (c) {
    const hits = [];
    c.phrases.forEach(function (p) { const m = p[1].exec(text); if (m) hits.push({ label: p[0], text: m[0].toLowerCase() }); });
    if (hits.length && (!best || hits.length > best.hits.length)) best = { cat: c, hits: hits };
  });
  const base = { id: 'ao1', task_text: text, evidence_state: 'reasonable_inference', unknowns: UNKNOWNS.slice(), not_included: NOT_INCLUDED, service: JSON.parse(JSON.stringify(SERVICE)) };
  // one weak match on a generic word is not enough to claim a category
  if (!best || (best.hits.length === 1 && ['sending', 'software', 'customers', 'regular', 'preparing', 'same information twice', 'channels', 'replying', 'jobs', 'revisions'].indexOf(best.hits[0].label) !== -1)) {
    return Object.assign(base, { category_key: 'other', workflow_title: OTHER.title, match_basis: 'no clear phrase match', confidence: 'low', description: OTHER.description, stages: OTHER.stages.slice(), integrations_likely_needed: OTHER.integrations.slice(), approval_points: OTHER.approvals.slice(), legal_note: OTHER.legal, demo: null });
  }
  const c = best.cat;
  const n = best.hits.length;
  return Object.assign(base, {
    category_key: c.key, workflow_title: c.title, match_basis: 'phrases: ' + best.hits.map(function (h) { return h.text; }).join(', '),
    confidence: n >= 3 ? 'high' : n === 2 ? 'medium' : 'low', description: c.description, stages: c.stages.slice(),
    integrations_likely_needed: c.integrations.slice(), approval_points: c.approvals.slice(), legal_note: c.legal, demo: c.demo ? { key: c.demo.key, href: c.demo.href } : null
  });
}

module.exports = { mapTask, CATS, NOT_INCLUDED };
