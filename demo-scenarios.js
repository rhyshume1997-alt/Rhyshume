/* Automation demonstration scenarios (WP-C).
   Inputs:  none. Outputs: DemoScenarios.{quoteFollowUp, enquiryToJob, documentApproval, all}, plain JSON objects read by demo-engine.js.
   Every business, person, quote number and date here is made up. There are no prices, no real email addresses and no phone numbers.
   To add a scenario: copy one of these objects, change the data, rules and text, and add it to `all`. The engine needs no change.
   Must not be changed: made up names only, no amounts of money, no links, no network or storage use.
   UMD: browser global (DemoScenarios) and Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DemoScenarios = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LABEL = 'Demonstration with made up data';

  var quoteFollowUp = {
    id: 'quote-follow-up',
    label: LABEL,
    title: 'Quote Follow Up',
    kind: 'Chasing quotations',
    noun: 'quote',
    listTitle: 'Open quotes',
    dueLabel: 'Valid until',
    historyTitle: 'Communication history',
    lead: 'A made up fabrication workshop sends quotes and forgets to chase them. Here the follow ups are prepared for you, and stop on their own once a customer says yes or no.',
    howTo: 'Move the demo clock forward with Skip to next day. When a follow up becomes due, a draft appears. Then try the customer buttons on a quote.',
    business: { name: 'Alder Bridge Fabrication (made up)', signoff: 'Morag Dunlop\nAlder Bridge Fabrication (made up)' },
    userName: 'Morag Dunlop',
    ownerId: 'morag',
    people: [
      { id: 'morag', name: 'Morag Dunlop', role: 'Office manager' },
      { id: 'callum', name: 'Callum Reid', role: 'Estimator' }
    ],
    clock: { start: '2026-03-02T11:00:00Z', ruleHour: 9, stepMinutes: 7,
      controls: [{ id: 'nextDay', label: 'Skip to next day' }, { id: 'days', days: 3, label: 'Skip 3 days' }] },
    fields: [
      { key: 'customer', label: 'Customer' },
      { key: 'contact', label: 'Contact' },
      { key: 'job', label: 'Work quoted' },
      { key: 'issued', label: 'Quote issued' }
    ],
    statuses: [
      { id: 'sent', label: 'Sent, waiting for a reply', tone: 'wait' },
      { id: 'in_discussion', label: 'In discussion', tone: 'wait' },
      { id: 'accepted', label: 'Accepted', tone: 'good', terminal: true, stopText: 'Stop rule applied: the quote was accepted, so no more reminders will be prepared.' },
      { id: 'declined', label: 'Declined', tone: 'closed', terminal: true, stopText: 'Stop rule applied: the quote was declined, so no more reminders will be prepared.' },
      { id: 'expired', label: 'Expired', tone: 'closed', terminal: true, stopText: 'Stop rule applied: the quote has expired, so no more reminders will be prepared.' },
      { id: 'closed', label: 'Closed', tone: 'closed', terminal: true, stopText: 'Stop rule applied: the quote was closed, so no more reminders will be prepared.' }
    ],
    stopRule: 'Reminders stop as soon as a quote is accepted, declined, expired or closed. Anything prepared and waiting is cancelled.',
    templates: {
      f1: { to: '{contact}, {customer}', subject: 'Quote {ref}: did it reach you?', body: 'Hello {contact},\n\nI am just checking that quote {ref} for {job} reached you, and whether you have any questions. It is valid until {due}.\n\nKind regards\n{signoff}' },
      f2: { to: '{contact}, {customer}', subject: 'Quote {ref}: any questions?', body: 'Hello {contact},\n\nA second note about quote {ref} for {job}. If anything is unclear, or the scope has changed, tell me and I will update it. The quote is valid until {due}.\n\nKind regards\n{signoff}' },
      f3: { to: '{contact}, {customer}', subject: 'Quote {ref}: last reminder', body: 'Hello {contact},\n\nThis is my last reminder about quote {ref} for {job}, valid until {due}. If it is no longer needed, no problem, just let me know and I will close it.\n\nKind regards\n{signoff}' }
    },
    rules: [
      { id: 'expire', trigger: 'tick', plain: 'On the day after a quote\'s valid until date, mark it as expired and stop all reminders.',
        when: { status: ['sent', 'in_discussion'], dueReached: true },
        then: [{ do: 'setStatus', status: 'expired', text: 'The valid until date has passed. Marked as expired.' }] },
      { id: 'followup', trigger: 'tick', params: { days: 3, max: 3 },
        plain: 'If there is no reply {days} days after the last contact, prepare a follow up for approval. Never more than {max} follow ups. If you discard a draft, the {days} days start again.',
        when: { status: ['sent'], daysSince: { ref: 'touchedAt', gte: '$days' }, firedLessThan: '$max', noPendingDraft: true },
        then: [{ do: 'prepare', templateByCount: ['f1', 'f2', 'f3'], approver: 'owner' }] },
      { id: 'phone', trigger: 'tick', params: { days: 3, max: 3 },
        plain: 'After {max} follow ups with no reply, stop preparing reminders and suggest a phone call instead.',
        when: { status: ['sent'], firedAtLeast: { rule: 'followup', n: '$max' }, daysSince: { ref: 'touchedAt', gte: '$days' }, noPendingDraft: true, flagNot: 'phone' },
        then: [{ do: 'flag', flag: 'phone', text: 'Three follow ups, still no reply. Suggested next step: a phone call from the estimator. No more reminders will be prepared.' }] }
    ],
    transitions: [
      { id: 'reply', label: 'Customer replies with a question', actor: 'customer', from: ['sent'], to: 'in_discussion', comms: 'in', log: '{actor} replied with a question about {ref}. Reminders pause while you are talking.' },
      { id: 'answered', label: 'I have answered, back to waiting', actor: 'user', from: ['in_discussion'], to: 'sent', comms: 'out', log: '{actor} answered the question. Waiting for a decision again, so the follow up days start again.' },
      { id: 'accept', label: 'Customer accepts the quote', actor: 'customer', tone: 'good', from: ['sent', 'in_discussion'], to: 'accepted', comms: 'in', log: '{actor} accepted quote {ref}.' },
      { id: 'decline', label: 'Customer declines the quote', actor: 'customer', from: ['sent', 'in_discussion'], to: 'declined', comms: 'in', log: '{actor} declined quote {ref}.' },
      { id: 'close', label: 'Close the quote myself', actor: 'user', from: ['sent', 'in_discussion'], to: 'closed', log: '{actor} closed quote {ref}.' }
    ],
    entities: [
      { id: 'Q-2041', type: 'quote', title: 'Steel brackets, laser cut', status: 'sent', createdAt: '2026-03-02T10:30:00Z', lastContactAt: '2026-03-02T10:30:00Z', due: '2026-03-16',
        fields: { customer: 'Tarbet Joinery (made up)', contact: 'Gordon Tarbet', job: 'eight laser cut steel brackets', issued: 'Mon 2 Mar' },
        history: [{ at: '2026-03-02T10:30:00Z', kind: 'comms_out', actor: 'Callum Reid', text: 'Quote Q-2041 sent by email to Gordon Tarbet.' }] },
      { id: 'Q-2042', type: 'quote', title: 'Mixer guard repair', status: 'sent', createdAt: '2026-02-27T15:00:00Z', lastContactAt: '2026-02-27T15:00:00Z', due: '2026-03-13',
        fields: { customer: 'Wester Mill Bakery (made up)', contact: 'Fiona Baird', job: 'a welded replacement mixer guard', issued: 'Fri 27 Feb' },
        history: [{ at: '2026-02-27T15:00:00Z', kind: 'comms_out', actor: 'Callum Reid', text: 'Quote Q-2042 sent by email to Fiona Baird.' }] },
      { id: 'Q-2043', type: 'quote', title: 'Coach step plates', status: 'sent', createdAt: '2026-03-02T09:30:00Z', lastContactAt: '2026-03-02T09:30:00Z', due: '2026-03-04',
        fields: { customer: 'Lenzie Coach Hire (made up)', contact: 'Iain Cormack', job: 'four folded step plates', issued: 'Mon 2 Mar' },
        history: [{ at: '2026-03-02T09:30:00Z', kind: 'comms_out', actor: 'Callum Reid', text: 'Quote Q-2043 sent by email to Iain Cormack. Valid for two days only.' }] }
    ],
    connect: {
      potential: [
        'Your quoting tool or spreadsheet, so each quote, its status and its valid until date come from one place.',
        'A shared email inbox, to send an approved follow up from your own address and notice a customer reply.',
        'A calendar or task list, to book the phone call this demonstration suggests.',
        'Your accounting package, to start the job paperwork once a quote is accepted.'
      ],
      existing: [
        'Nothing in this demonstration is connected to anything. It runs in your browser with made up data.',
        'Elsewhere on this site, the contact form already sends me an email through a sending service. That is not used here.'
      ]
    }
  };

  var enquiryToJob = {
    id: 'enquiry-to-job',
    label: LABEL,
    title: 'Enquiry to Job',
    kind: 'Handling new enquiries',
    noun: 'enquiry',
    listTitle: 'Outstanding enquiries',
    historyTitle: 'History of this enquiry',
    assign: [{ field: 'assignee', label: 'Assigned to' }],
    lead: 'A made up machining and repair shop gets enquiries by email and web form. Each one is read into fields you can correct, then moves through the job stages with a customer update prepared at each change.',
    howTo: 'Press Receive the next enquiry. Check the details, correct anything wrong, assign someone, then move the job along and watch the drafts appear.',
    business: { name: 'Clydeholm Machining and Repair (made up)', signoff: 'Eilidh Shaw\nClydeholm Machining and Repair (made up)' },
    userName: 'Eilidh Shaw',
    ownerId: 'eilidh',
    initialStatus: 'new',
    people: [
      { id: 'eilidh', name: 'Eilidh Shaw', role: 'Owner' },
      { id: 'callum', name: 'Callum Reid', role: 'Estimator' },
      { id: 'ross', name: 'Ross Gilchrist', role: 'Workshop lead' }
    ],
    clock: { start: '2026-03-02T11:00:00Z', ruleHour: 9, stepMinutes: 9,
      controls: [{ id: 'nextDay', label: 'Skip to next day' }] },
    fields: [
      { key: 'customer', label: 'Customer' },
      { key: 'contact', label: 'Contact' },
      { key: 'reply', label: 'Reply to' },
      { key: 'job', label: 'Type of work' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'material', label: 'Material' },
      { key: 'needed', label: 'Needed by' }
    ],
    statuses: [
      { id: 'new', label: 'New enquiry', tone: 'wait' },
      { id: 'checked', label: 'Details checked', tone: 'wait' },
      { id: 'quote_sent', label: 'Quote sent', tone: 'wait' },
      { id: 'booked', label: 'Booked in', tone: 'go' },
      { id: 'in_progress', label: 'In progress', tone: 'go' },
      { id: 'ready', label: 'Ready for collection', tone: 'go' },
      { id: 'complete', label: 'Complete', tone: 'good', terminal: true, stopText: 'The job is complete, so it leaves the outstanding list.' },
      { id: 'declined', label: 'Not taken on', tone: 'closed', terminal: true, stopText: 'Not taken on, so it leaves the outstanding list.' }
    ],
    stopRule: 'A completed or declined enquiry leaves the outstanding list and anything waiting for approval is cancelled.',
    templates: {
      ack: { to: '{contact}, {reply}', subject: 'We have your enquiry {ref}', body: 'Hello {contact},\n\nThank you for your enquiry about {job}. We have it as reference {ref} and someone will look at it shortly. If any detail below is wrong, tell us.\n\nKind regards\n{signoff}' },
      quote_sent: { to: '{contact}, {reply}', subject: 'Your quote for {ref}', body: 'Hello {contact},\n\nOur quote for {job} ({ref}) is on its way to you. Please read it and reply with any questions.\n\nKind regards\n{signoff}' },
      booked: { to: '{contact}, {reply}', subject: '{ref} is booked in', body: 'Hello {contact},\n\nThank you for confirming. Your job ({ref}) is booked in. {assignee} will be looking after it.\n\nKind regards\n{signoff}' },
      in_progress: { to: '{contact}, {reply}', subject: '{ref}: work has started', body: 'Hello {contact},\n\nA quick update: work has started on {job} ({ref}).\n\nKind regards\n{signoff}' },
      ready: { to: '{contact}, {reply}', subject: '{ref} is ready for collection', body: 'Hello {contact},\n\nYour job ({ref}) is ready for collection. Tell us when suits you.\n\nKind regards\n{signoff}' },
      complete: { to: '{contact}, {reply}', subject: '{ref} is complete', body: 'Hello {contact},\n\nThank you. Job {ref} is now complete. If anything is not right, please tell us.\n\nKind regards\n{signoff}' }
    },
    rules: [
      { id: 'ack', trigger: 'status', plain: 'When an enquiry arrives, prepare an acknowledgement for approval.',
        when: { status: ['new'] }, then: [{ do: 'prepare', template: 'ack', approver: 'owner' }] },
      { id: 'update', trigger: 'status', plain: 'Whenever the status changes, prepare a customer update for approval. Nothing is sent until a person approves it.',
        when: { status: ['quote_sent', 'booked', 'in_progress', 'ready', 'complete'] },
        then: [{ do: 'prepare', templateByStatus: { quote_sent: 'quote_sent', booked: 'booked', in_progress: 'in_progress', ready: 'ready', complete: 'complete' }, approver: 'owner' }] },
      { id: 'overdue', trigger: 'tick', params: { days: 1 }, plain: 'If an enquiry is still waiting to be checked {days} day after it arrived, flag it as overdue on the outstanding list.',
        when: { status: ['new'], daysSince: { ref: 'createdAt', gte: '$days' }, flagNot: 'overdue' },
        then: [{ do: 'flag', flag: 'overdue', text: 'Still not checked after a day. Flagged as overdue.' }] }
    ],
    transitions: [
      { id: 'send_quote', label: 'Mark the quote as sent', actor: 'user', from: ['checked'], to: 'quote_sent', log: '{actor} marked the quote as sent.' },
      { id: 'book', label: 'Customer says yes, book it in', actor: 'customer', from: ['quote_sent'], to: 'booked', comms: 'in', log: '{actor} accepted the quote. The job is booked in.' },
      { id: 'start', label: 'Start the work', actor: 'user', from: ['booked'], to: 'in_progress', log: '{actor} started the work.' },
      { id: 'ready', label: 'Mark ready for collection', actor: 'user', from: ['in_progress'], to: 'ready', log: '{actor} marked the job ready for collection.' },
      { id: 'complete', label: 'Mark complete', actor: 'user', tone: 'good', from: ['ready'], to: 'complete', log: '{actor} marked the job complete.' },
      { id: 'decline', label: 'Not taking this on', actor: 'user', from: ['new', 'checked', 'quote_sent'], to: 'declined', log: '{actor} decided not to take this enquiry on.' }
    ],
    entities: [
      { id: 'J-0097', type: 'enquiry', title: 'Signboard bracket repair', status: 'booked', createdAt: '2026-02-26T10:00:00Z', statusAt: '2026-02-27T14:00:00Z', confirmed: true, assignee: 'ross', source: 'web form',
        fields: { customer: 'Ardmore Signs (made up)', contact: 'Peter Lyle', reply: 'peter@ardmore-signs.example', job: 'repair', quantity: '2', material: 'mild steel', needed: 'Fri 13 Mar' },
        history: [
          { at: '2026-02-26T10:00:00Z', kind: 'comms_in', actor: 'Peter Lyle', text: 'Enquiry received by web form.' },
          { at: '2026-02-26T10:20:00Z', kind: 'edit', actor: 'Eilidh Shaw', text: 'Details checked and confirmed. Nothing needed correcting.' },
          { at: '2026-02-27T14:00:00Z', kind: 'status', actor: 'Peter Lyle', text: 'Peter Lyle accepted the quote. The job is booked in.' },
          { at: '2026-02-27T14:05:00Z', kind: 'assign', actor: 'Eilidh Shaw', text: 'Assigned to Ross Gilchrist (Workshop lead).' }
        ] }
    ],
    inbox: [
      { id: 'E-0098', title: 'Aluminium brackets', source: 'email',
        raw: 'Subject: Brackets from drawing\n\nHi, could you machine 25 aluminium brackets from the attached drawing? We need them by the end of the month. Thanks, Iain (Dunmore Marine Supplies)',
        fields: { customer: 'Dunmore Marine Supplies (made up)', contact: 'Iain', reply: 'iain@dunmore-marine.example', job: 'machining', quantity: '25', material: 'aluminium', needed: 'end of March' },
        check: { quantity: true, needed: true } },
      { id: 'E-0099', title: 'Cracked mixer guard', source: 'web form',
        raw: 'Our dough mixer guard has cracked. Can someone weld a replacement this week? Fiona Baird, Wester Mill Bakery.',
        fields: { customer: 'Wester Mill Bakery (made up)', contact: 'Fiona Baird', reply: 'fiona@westermill-bakery.example', job: 'repair', quantity: '1', material: 'not stated', needed: 'this week' },
        check: { material: true, needed: true } },
      { id: 'E-0100', title: 'Stainless handrails', source: 'email',
        raw: 'Subject: Handrails\n\nWe are after three sets of stainless handrails for a ramp, ideally fitted before the 20th. Can you quote? Regards, Nuala at Kelvin Court Flats.',
        fields: { customer: 'Kelvin Court Flats (made up)', contact: 'Nuala', reply: 'nuala@kelvincourt.example', job: 'fabrication and fitting', quantity: '3 sets', material: 'stainless steel', needed: '20 Mar' },
        check: { contact: true } }
    ],
    connect: {
      potential: [
        'A website form and a shared enquiries inbox, so each message becomes a record without anyone retyping it.',
        'An assistant that reads the message and suggests the fields. In this demonstration the fields are pre filled, not read live, and a person always checks them.',
        'Your job or order system, so a checked enquiry becomes a job with the same details.',
        'Your email, to send an approved customer update from your own address.'
      ],
      existing: [
        'Nothing in this demonstration is connected to anything. The messages above are invented and pre filled.',
        'Elsewhere on this site, the contact form already has spam protection and sends me an email. That is not used here.'
      ]
    }
  };

  var documentApproval = {
    id: 'document-approval',
    label: LABEL,
    title: 'Document Approval',
    kind: 'Documents and approvals',
    noun: 'document',
    listTitle: 'Documents',
    historyTitle: 'Audit trail',
    assign: [{ field: 'approver', label: 'Approver' }],
    lead: 'A made up controls manufacturer keeps work instructions that someone has to approve. Each document has revision letters, a named approver, a locked approved revision and a record of who did what.',
    howTo: 'Choose a document. Act as the author to submit it, then as the approver to approve it or ask for changes. Try editing an approved revision.',
    business: { name: 'Calderbank Controls (made up)', signoff: 'Ross Gilchrist\nCalderbank Controls (made up)' },
    userName: 'Ross Gilchrist',
    ownerId: 'ross',
    people: [
      { id: 'ross', name: 'Ross Gilchrist', role: 'Workshop lead' },
      { id: 'eilidh', name: 'Eilidh Shaw', role: 'Quality lead' },
      { id: 'ravi', name: 'Ravi Menon', role: 'Production engineer' }
    ],
    clock: { start: '2026-03-02T09:00:00Z', ruleHour: 9, stepMinutes: 11,
      controls: [{ id: 'nextDay', label: 'Skip to next day' }, { id: 'days', days: 3, label: 'Skip 3 days' }] },
    fields: [
      { key: 'docno', label: 'Document number' },
      { key: 'type', label: 'Type' }
    ],
    statuses: [
      { id: 'draft', label: 'Draft', tone: 'wait' },
      { id: 'in_review', label: 'With approver', tone: 'wait' },
      { id: 'changes_requested', label: 'Changes requested', tone: 'go' },
      { id: 'approved', label: 'Approved and locked', tone: 'good' }
    ],
    stopRule: 'An approved revision is locked. Its text cannot be edited, and a change needs a new revision with a new letter.',
    templates: {
      chase: { to: '{approver}', subject: '{ref} Rev {rev} is waiting for your decision', body: 'Hello {approver},\n\n{ref}, {title}, Rev {rev}, has been waiting for your decision since it was submitted. Could you approve it or ask for changes?\n\nThank you\n{author}' }
    },
    rules: [
      { id: 'chase', trigger: 'tick', params: { days: 2, max: 2 },
        plain: 'If a document has waited {days} days for a decision, prepare a reminder to the approver, for the author to approve. Never more than {max} reminders.',
        when: { status: ['in_review'], daysSince: { ref: 'statusAt', gte: '$days' }, firedLessThan: '$max', noPendingDraft: true },
        then: [{ do: 'prepare', template: 'chase', approver: 'entity.author' }] }
    ],
    transitions: [
      { id: 'submit', label: 'Submit Rev {rev} for review', actor: 'author', from: ['draft'], to: 'in_review', revision: 'submit', requires: 'approver', log: '{actor} submitted Rev {rev} to {approver} for review.' },
      { id: 'approve', label: 'Approve Rev {rev}', actor: 'approver', tone: 'good', from: ['in_review'], to: 'approved', revision: 'decide', lock: true, input: { label: 'Optional note', default: '', required: false }, log: '{actor} approved Rev {rev}. The revision is now locked.' },
      { id: 'request_changes', label: 'Request changes', actor: 'approver', from: ['in_review'], to: 'changes_requested', revision: 'decide', input: { label: 'Reason for the changes', default: 'Step 3 is unclear. Say which order to follow.', required: true }, log: '{actor} requested changes to Rev {rev}: {input}' },
      { id: 'revise', label: 'Start the next revision', actor: 'author', from: ['changes_requested'], to: 'draft', revision: 'new', log: '{actor} started Rev {rev} from the text of the previous revision.' },
      { id: 'raise_change', label: 'Raise a change (new revision)', actor: 'author', from: ['approved'], to: 'draft', revision: 'new', log: '{actor} raised a change and started Rev {rev}. The approved revision stays in force until Rev {rev} is approved.' }
    ],
    entities: [
      { id: 'WI-014', type: 'document', title: 'Torque check, gearbox housing', status: 'draft', createdAt: '2026-03-02T08:30:00Z', author: 'ross', approver: 'eilidh',
        fields: { docno: 'WI-014', type: 'Work instruction' },
        revisions: [{ letter: 'A', status: 'draft', createdAt: '2026-03-02T08:30:00Z', createdBy: 'ross', summary: 'First issue',
          text: '1. Clean the mating faces of the housing.\n2. Fit the bolts finger tight, in the order shown on the drawing.\n3. Tighten to the torque on the drawing.\n4. Record the result on the check sheet.' }],
        history: [{ at: '2026-03-02T08:30:00Z', kind: 'revision', actor: 'Ross Gilchrist', text: 'Created WI-014 Rev A as a draft.' }] },
      { id: 'PRC-007', type: 'document', title: 'Goods in inspection', status: 'in_review', createdAt: '2026-02-20T09:00:00Z', statusAt: '2026-02-27T09:30:00Z', author: 'ross', approver: 'ravi',
        fields: { docno: 'PRC-007', type: 'Procedure' },
        revisions: [
          { letter: 'A', status: 'approved', createdAt: '2026-02-20T09:00:00Z', createdBy: 'ross', summary: 'First issue', decidedAt: '2026-02-24T10:00:00Z', decidedBy: 'ravi', locked: true,
            text: '1. Check the delivery note against the order.\n2. Look for visible damage and photograph it.\n3. Label accepted goods and move them to stores.' },
          { letter: 'B', status: 'in_review', createdAt: '2026-02-26T13:00:00Z', createdBy: 'ross', summary: 'Adds a step for items with a certificate',
            text: '1. Check the delivery note against the order.\n2. Look for visible damage and photograph it.\n3. If a certificate came with the goods, file it with the order.\n4. Label accepted goods and move them to stores.' }
        ],
        history: [
          { at: '2026-02-20T09:00:00Z', kind: 'revision', actor: 'Ross Gilchrist', text: 'Created PRC-007 Rev A as a draft.' },
          { at: '2026-02-20T09:40:00Z', kind: 'status', actor: 'Ross Gilchrist', text: 'Ross Gilchrist submitted Rev A to Ravi Menon for review.' },
          { at: '2026-02-24T10:00:00Z', kind: 'status', actor: 'Ravi Menon', text: 'Ravi Menon approved Rev A. The revision is now locked.' },
          { at: '2026-02-26T13:00:00Z', kind: 'revision', actor: 'Ross Gilchrist', text: 'Ross Gilchrist raised a change and started Rev B.' },
          { at: '2026-02-27T09:30:00Z', kind: 'status', actor: 'Ross Gilchrist', text: 'Ross Gilchrist submitted Rev B to Ravi Menon for review.' }
        ] }
    ],
    connect: {
      potential: [
        'Your shared drive or document store, so the approved revision is the one people open.',
        'Your sign in system, so the "who" in the record is a real, signed in person rather than a name on screen.',
        'Email or messaging, to tell the approver a document is waiting and to send an approved reminder.',
        'A job or product record, so a document is linked to the work it controls.'
      ],
      existing: [
        'Nothing in this demonstration is connected to anything. People and times are made up and the clock is simulated.',
        'My private client workbook uses an owner only sign in and a database with access rules. It is a separate system and is not used here.',
        'This is not a quality system and makes no claim about any standard. A real build would follow your own document control procedure.'
      ]
    }
  };

  documentApproval.alwaysRules = ['The author of a document can never be its approver. Choosing the author as approver is refused.'];

  return { quoteFollowUp: quoteFollowUp, enquiryToJob: enquiryToJob, documentApproval: documentApproval, all: [quoteFollowUp, enquiryToJob, documentApproval], label: LABEL };
});
