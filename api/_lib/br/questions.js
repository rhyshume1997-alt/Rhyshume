'use strict';
/*
Business review: deterministic customer style question set for AI visibility testing (set id qs-1).
Inputs : category and location (text and kind). Outputs: 10 questions with stable ids q1..q10.
Rules  : no model writes the questions, so the set is reproducible, free and testable; the exact text is stored with every run.
Must not change: ids and templates for qs-1. A new wording needs a new set id (qs-2), never an edit.
*/
const SET_ID = 'qs-1';

function tidyCategory(c) {
  return String(c || '').trim().split(/\s+/).map(function (w) { return /[A-Z].*[A-Z]/.test(w) ? w : w.toLowerCase(); }).join(' ');
}

function generateQuestions(input) {
  const cat = tidyCategory(input.category);
  const loc = String(input.location && input.location.text || '').trim();
  const kind = (input.location && input.location.kind) || 'local';
  const where = kind === 'national' ? 'in the UK' : kind === 'regional' ? 'serving ' + loc + ' and the surrounding area' : 'in ' + loc;
  const near = kind === 'national' ? 'in the UK' : 'near ' + loc;
  if (!cat || !loc) return [];
  const t = [
    'Which ' + cat + ' companies are there ' + where + '?',
    'Who are the best ' + cat + ' providers ' + where + '?',
    'Can you recommend a reliable ' + cat + ' business ' + near + '?',
    'What should I look for when choosing a ' + cat + ' company ' + where + '?',
    'Which ' + cat + ' businesses ' + where + ' have good reviews?',
    'How do I find a trustworthy ' + cat + ' supplier ' + where + '?',
    'Who offers ' + cat + ' services ' + where + '?',
    'Which ' + cat + ' firms would you suggest for a small business ' + where + '?',
    'I need a quote for ' + cat + '. Which companies ' + where + ' should I contact?',
    'Which ' + cat + ' companies ' + where + ' are worth contacting?'
  ];
  return t.map(function (text, i) { return { question_id: 'q' + (i + 1), question_set: SET_ID, question_text: text }; });
}

module.exports = { generateQuestions, SET_ID, tidyCategory };
