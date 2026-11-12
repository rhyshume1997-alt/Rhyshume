/*
  Upgrade my site: the Google Sheet side. Paste this whole file into the Sheet (Extensions, Apps Script).
  It does three jobs:
    1. doPost       saves each form request from rhyshume.co.uk/upgrade as a row, with the limits.
    2. Approve tick starts the existing "Build preview" GitHub Action with that row's slug and website filled in.
    3. Send link    tick checks the preview link opens without a login, then emails it to them from your Gmail.

  Script Properties (Project Settings, Script Properties). Never paste these in chat:
    SHARED_SECRET  the same long random string as UPGRADE_SHEET_SECRET in Vercel
    GITHUB_TOKEN   fine-grained token, only the Rhyshume repo, permission Actions: Read and write
    NOTIFY_EMAIL   where new request alerts go, e.g. rhys@rhyshume.co.uk
    DAILY_LIMIT    optional, requests allowed per day in total (default 10)

  Run setup() once. Then add an installable trigger: onSheetEdit, From spreadsheet, On edit.
*/

var TAB = 'Requests';
var REPO = 'rhyshume1997-alt/Rhyshume';
var WORKFLOW = 'preview.yml';
var HEADERS = ['Received', 'Website', 'Domain', 'Email', 'Marketing OK', 'Slug', 'Niche', 'Approve', 'Status', 'Preview link', 'Send link', 'Link sent', 'Notes'];
var COL = {};
HEADERS.forEach(function (h, i) { COL[h] = i + 1; });

function prop(name) { return PropertiesService.getScriptProperties().getProperty(name) || ''; }

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(prop('SHEET_ID'));
  return ss.getSheetByName(TAB);
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB) || ss.insertSheet(TAB);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 1. Save a request from the website.
function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false, reason: 'bad_json' }); }
  if (!prop('SHARED_SECRET') || data.secret !== prop('SHARED_SECRET')) return reply({ ok: false, reason: 'bad_secret' });

  var website = String(data.website || '').slice(0, 300);
  var domain = String(data.domain || '').toLowerCase().slice(0, 253);
  var email = String(data.email || '').toLowerCase().slice(0, 200);
  if (!/^https:\/\/[a-z0-9.-]+\/$/.test(website) || !domain || email.indexOf('@') < 1) return reply({ ok: false, reason: 'bad_fields' });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet();
    var last = sh.getLastRow();
    var rows = last > 1 ? sh.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
    var today = Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM-dd');
    var countToday = 0;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][COL['Domain'] - 1]).toLowerCase() === domain) return reply({ ok: false, reason: 'duplicate' });
      if (String(rows[i][COL['Email'] - 1]).toLowerCase() === email) return reply({ ok: false, reason: 'duplicate' });
      var when = rows[i][COL['Received'] - 1];
      if (when instanceof Date && Utilities.formatDate(when, 'Europe/London', 'yyyy-MM-dd') === today) countToday++;
    }
    if (countToday >= (parseInt(prop('DAILY_LIMIT'), 10) || 10)) return reply({ ok: false, reason: 'daily_limit' });

    var row = [];
    row[COL['Received'] - 1] = new Date();
    row[COL['Website'] - 1] = website;
    row[COL['Domain'] - 1] = domain;
    row[COL['Email'] - 1] = email;
    row[COL['Marketing OK'] - 1] = data.marketing === 'yes' ? 'yes' : 'no';
    row[COL['Slug'] - 1] = makeSlug(domain);
    row[COL['Niche'] - 1] = 'none';
    row[COL['Approve'] - 1] = false;
    row[COL['Status'] - 1] = 'New';
    row[COL['Preview link'] - 1] = '';
    row[COL['Send link'] - 1] = false;
    row[COL['Link sent'] - 1] = '';
    row[COL['Notes'] - 1] = '';
    sh.appendRow(row);
    var r = sh.getLastRow();
    sh.getRange(r, COL['Approve']).insertCheckboxes();
    sh.getRange(r, COL['Send link']).insertCheckboxes();
    sh.getRange(r, COL['Niche']).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['none', 'engineering'], true).build());
  } finally {
    lock.releaseLock();
  }

  if (prop('NOTIFY_EMAIL')) {
    MailApp.sendEmail(prop('NOTIFY_EMAIL'), 'New upgrade request: ' + domain,
      'Website: ' + website + '\nEmail: ' + email + '\nMarketing OK: ' + (data.marketing === 'yes' ? 'yes' : 'no') +
      '\n\nOpen the Requests tab, check it, set Niche if it is an engineering firm, then tick Approve.');
  }
  return reply({ ok: true });
}

// Slug for the Build preview Action: lower case, hyphens only, plus 4 random characters so it cannot be guessed.
function makeSlug(domain) {
  var base = domain.split('.')[0].replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'site';
  var chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  var tail = '';
  for (var i = 0; i < 4; i++) tail += chars.charAt(Math.floor(Math.random() * chars.length));
  return base + '-' + tail;
}

// 2 and 3. Runs on every edit (installable trigger). Only reacts to ticking Approve or Send link.
function onSheetEdit(e) {
  var range = e.range;
  var sh = range.getSheet();
  if (sh.getName() !== TAB || range.getRow() < 2 || range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  if (range.getValue() !== true) return;
  var r = range.getRow();
  var col = range.getColumn();
  var get = function (name) { return sh.getRange(r, COL[name]).getValue(); };
  var set = function (name, v) { sh.getRange(r, COL[name]).setValue(v); };

  if (col === COL['Approve']) {
    if (get('Status') !== 'New') { set('Notes', 'Approve ignored: status is not New.'); return; }
    var niche = get('Niche') === 'engineering' ? 'engineering' : 'none';
    var res = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/dispatches', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + prop('GITHUB_TOKEN'), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      payload: JSON.stringify({ ref: 'main', inputs: { prospects: get('Slug') + '=' + get('Website'), niche: niche } }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 204) {
      set('Status', 'Build started ' + Utilities.formatDate(new Date(), 'Europe/London', 'd MMM HH:mm'));
      set('Notes', 'Check the Actions tab, then the pull request for preview-' + get('Slug') + '.');
    } else {
      range.setValue(false);
      set('Status', 'New');
      set('Notes', 'Build did not start. GitHub said ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
    }
    return;
  }

  if (col === COL['Send link']) {
    if (get('Link sent')) { set('Notes', 'Link already sent, not sent again.'); return; }
    var link = String(get('Preview link')).trim();
    if (!/^https:\/\//.test(link)) { range.setValue(false); set('Notes', 'Put the preview link in the Preview link column first.'); return; }
    var check = UrlFetchApp.fetch(link, { followRedirects: true, muteHttpExceptions: true });
    var body = check.getContentText().slice(0, 20000);
    if (check.getResponseCode() !== 200 || /vercel\.com\/login|Vercel Authentication|Log in to Vercel/i.test(body)) {
      range.setValue(false);
      set('Notes', 'Not sent: the link did not open without a login (HTTP ' + check.getResponseCode() + '). Check the share setting.');
      return;
    }
    GmailApp.sendEmail(get('Email'), 'Your website concept for ' + get('Domain'), linkEmail(get('Domain'), link), {
      name: 'Rhys Hume',
      replyTo: 'rhys@rhyshume.co.uk'
    });
    set('Link sent', new Date());
    set('Status', 'Link sent');
    set('Notes', '');
  }
}

function linkEmail(domain, link) {
  return 'Hi,\n\n' +
    'Thanks for asking for a concept of ' + domain + '. Here it is:\n' + link + '\n\n' +
    'It’s built only from what’s on your current site, with a before and after so you can compare. ' +
    'It’s a concept, not a live site, and nothing you type into it gets sent anywhere.\n\n' +
    'What would you change? Just reply to this email.\n\n' +
    'Rhys Hume\nrhyshume.co.uk | rhys@rhyshume.co.uk | 07908 041480\n\n' +
    'If you’d rather not hear from me again, reply "no" and I won’t email again.';
}
