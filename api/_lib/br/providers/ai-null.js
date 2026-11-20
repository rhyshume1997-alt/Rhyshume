'use strict';
/*
Business review: AI visibility provider that is not configured. Returns an honest unavailable state and never any answer.
Inputs : none. Outputs: status() = not_configured, run() = { ok:false, code:'not_configured' }.
Why    : no supported AI search adapter has been chosen or switched on (DECISIONS 5c). A plain model reply is never a search result.
Must not change: it must never return data.
*/
function create(id) {
  return {
    id: id, kind: 'ai_search', label: 'AI search tool (not set up)',
    status: function () { return { state: 'not_configured', reason: 'no_supported_adapter' }; },
    run: async function () { return { ok: false, code: 'not_configured', retryable: false }; }
  };
}
module.exports = { create };
