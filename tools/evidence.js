'use strict';

/*
  Evidence for the concept page: things wrong with a prospect's current site that they may not know about,
  each shown with the proof taken from their own page source. Nothing here is estimated or invented.
  Every check reads the public HTML that was fetched, so a finding is either there or it is not.

  checkSite(pages, extra) pages: [{ url, html }], the home page first.
                          extra:  { sitemap: true|false|undefined } from a separate fetch.
  Returns an array of { id, label, pass, sev, issue, proof, why, where }.
  sev: 3 can cost them enquiries now, 2 hurts how they appear in search or on phones, 1 looks dated.
*/

function strip(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function clip(s, n) { s = strip(s); return s.length > n ? s.slice(0, n - 1) + '...' : s; }
function text(html) {
  return String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#169;|&copy;/g, '©').replace(/\s+/g, ' ');
}
function metaTag(html, name) {
  const re = new RegExp('<meta\\b[^>]*(?:name|property)=["\']' + name + '["\'][^>]*>', 'i');
  const m = String(html).match(re);
  if (!m) return null;
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? strip(c[1]) : '';
}

function checkSite(pages, extra, now) {
  extra = extra || {};
  const home = pages[0];
  const html = home.html || '';
  const t = text(html);
  const year = (now || new Date()).getFullYear();
  const out = [];
  const add = function (o) { out.push(Object.assign({ where: home.url }, o)); };

  // Hidden from search entirely
  const robots = metaTag(html, 'robots');
  add({ id: 'noindex', label: 'Open to search engines', sev: 3, pass: !(robots && /noindex/i.test(robots)),
    issue: 'The home page tells search engines not to list it',
    proof: 'The page source contains a robots tag set to "' + clip(robots || '', 40) + '"',
    why: 'Google is being asked to leave this page out of results, so people searching for you cannot find it.' });

  // Mobile
  const viewport = /<meta\b[^>]*name=["']viewport["']/i.test(html);
  add({ id: 'viewport', label: 'Set up for phones', sev: 3, pass: viewport,
    issue: 'The page is not set up for phones',
    proof: 'There is no "viewport" tag in the page source, so a phone shows the full desktop page shrunk down.',
    why: 'Google judges the mobile version of a page first, and a shrunk page is hard to read and tap, so visitors leave.' });

  // Title
  const tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = tm ? strip(tm[1].replace(/&amp;/g, '&')) : '';
  const titleBad = !title || title.length > 70 || title.length < 12;
  add({ id: 'title', label: 'Clear page title', sev: 2, pass: !titleBad,
    issue: !title ? 'The home page has no title' : (title.length > 70 ? 'The page title is a long list, ' + title.length + ' characters' : 'The page title is too short to say what you do'),
    proof: !title ? 'There is no title tag in the page source.' : 'The title reads: "' + clip(title, 110) + '"',
    why: 'The title is the blue link people see in Google. Google cuts anything long, and a short one says nothing about the work you do or where.' });

  // Description
  const desc = metaTag(html, 'description');
  add({ id: 'description', label: 'Search description', sev: 2, pass: !!desc,
    issue: 'There is no description for search results',
    proof: 'No meta description tag in the page source.',
    why: 'Google then writes its own snippet from whatever text it finds, which may not say what you want a buyer to read.' });

  // H1
  const h1s = (html.match(/<h1\b/gi) || []).length;
  add({ id: 'h1', label: 'One main heading', sev: 2, pass: h1s === 1,
    issue: h1s === 0 ? 'There is no main heading on the home page' : 'There are ' + h1s + ' main headings on the home page',
    proof: 'The page source has ' + h1s + ' h1 tag' + (h1s === 1 ? '' : 's') + '. One is expected.',
    why: 'The main heading is how search engines and AI tools work out what a page is about.' });

  // Structured data
  const schema = /application\/ld\+json/i.test(html) || /itemtype=["']https?:\/\/schema\.org/i.test(html);
  add({ id: 'schema', label: 'Business details machines can read', sev: 2, pass: schema,
    issue: 'Your business details are not marked up for search and AI tools',
    proof: 'No structured data (schema.org) was found in the page source.',
    why: 'Structured data states your name, area, phone and services in a form Google and AI assistants can read directly, instead of guessing from the page.' });

  // Phone not clickable
  const phoneInText = /(?:\+44\s?\(?0?\)?\s?|\b0)(?:\d[\s-]?){9,10}\b/.test(t);
  const telLink = /href=["']tel:/i.test(html);
  add({ id: 'tel', label: 'Tap to call', sev: 3, pass: !phoneInText || telLink,
    issue: 'Your phone number cannot be tapped to call',
    proof: 'A phone number is written on the page but no tel: link is attached to it.',
    why: 'Most visits come from a phone. If the number is plain text the visitor has to copy and paste it, and many will not.' });

  // Non-geographic number
  const ng = t.match(/\b0(?:84[3-5]|87[0-3])[\s-]?\d{3}[\s-]?\d{4}\b/);
  add({ id: 'nongeo', label: 'Local phone number', sev: 1, pass: !ng,
    issue: 'The page shows an old style 08 number',
    proof: 'The page lists ' + (ng ? ng[0] : '') + '.',
    why: '08 numbers look dated and can cost the caller more than a normal call, so some buyers will not ring it.' });

  // Fax
  const fax = /\bfax\b[\s:.-]*\+?[\d(]/i.test(t);
  add({ id: 'fax', label: 'Up to date contact details', sev: 1, pass: !fax,
    issue: 'The page lists a fax number',
    proof: 'The page text includes a line starting "Fax".',
    why: 'A fax number tells a buyer the page has not been looked at in a long time.' });

  // Stale copyright
  const cy = [];
  t.replace(/(?:©|copyright)\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi, function (m, y) { cy.push(Number(y)); return m; });
  const stale = cy.length && Math.max.apply(null, cy) <= year - 2;
  add({ id: 'year', label: 'Looks maintained', sev: 1, pass: !stale,
    issue: 'The footer still says ' + (cy.length ? Math.max.apply(null, cy) : ''),
    proof: 'The footer carries a copyright year of ' + (cy.length ? Math.max.apply(null, cy) : '') + '. It is now ' + year + '.',
    why: 'A buyer checking whether you are still trading reads an old date as a sign you may not be.' });

  // Placeholder text
  const ph = t.match(/lorem ipsum|new website coming soon|sample-page|button button|your (?:text|title) here/i) || (/sample-page/i.test(html) ? ['sample-page'] : null);
  add({ id: 'placeholder', label: 'No leftover template text', sev: 3, pass: !ph,
    issue: 'Template text has been left on the site',
    proof: 'The page contains "' + (ph ? ph[0] : '') + '".',
    why: 'Leftover template text tells a buyer the site was never finished, and that can colour how they judge the work.' });

  // Alt text
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter(function (i) { return !/\balt=["'][^"']+["']/i.test(i); }).length;
  add({ id: 'alt', label: 'Photos described', sev: 2, pass: !(imgs.length >= 3 && noAlt / imgs.length >= 0.4),
    issue: noAlt + ' of ' + imgs.length + ' photos have no description',
    proof: 'In the page source ' + noAlt + ' of ' + imgs.length + ' image tags have no alt text.',
    why: 'Alt text is how Google Images, screen readers and AI tools know what a photo shows. Without it your work is invisible to them.' });

  // Form
  const hasForm = pages.some(function (p) { return /<form\b[\s\S]*?<(?:textarea|input[^>]*type=["']?(?:email|tel)["'\s>])/i.test(p.html || ''); });
  add({ id: 'form', label: 'A way to enquire online', sev: 3, pass: hasForm,
    issue: 'There is no enquiry form',
    proof: 'None of the ' + pages.length + ' page' + (pages.length === 1 ? '' : 's') + ' read has a form to send a message or a drawing.',
    why: 'Buyers out of hours or on a phone often will not ring. With no form they contact the next firm instead.' });

  // HTTPS and mixed content
  const secure = /^https:/i.test(home.url);
  add({ id: 'https', label: 'Secure (https)', sev: 3, pass: secure,
    issue: 'The site is not secure',
    proof: 'The address the site finished on starts with http, not https.',
    why: 'Browsers show a Not secure warning next to the address, which puts people off sending a message or a file.' });

  // Social sharing
  const og = metaTag(html, 'og:title');
  add({ id: 'og', label: 'Shows well when shared', sev: 1, pass: og !== null,
    issue: 'Links to the site share as a bare address',
    proof: 'No Open Graph tags are in the page source.',
    why: 'When someone shares the link on WhatsApp or Facebook it shows without a title or picture, which looks unfinished.' });

  // Old WordPress
  const gen = metaTag(html, 'generator');
  const wp = gen && gen.match(/wordpress\s+(\d+)\.(\d+)/i);
  add({ id: 'wp', label: 'Software kept up to date', sev: 2, pass: !(wp && Number(wp[1]) < 6),
    issue: 'The site runs an old version of WordPress',
    proof: 'The page source says: "' + clip(gen || '', 40) + '".',
    why: 'Old versions stop getting security fixes, which is how small business sites get hacked and used to send spam.' });

  // Sitemap, only when it was looked for
  if (typeof extra.sitemap === 'boolean') {
    add({ id: 'sitemap', label: 'Sitemap for search engines', sev: 2, pass: extra.sitemap,
      issue: 'There is no sitemap',
      proof: 'The address /sitemap.xml on their site does not return a sitemap.',
      why: 'A sitemap lists every page for Google. Without one, new or deeper pages can take much longer to be found.' });
  }
  return out;
}

// The findings worth showing, worst first, at most max.
function topProblems(checks, max) {
  return checks.filter(function (c) { return !c.pass; })
    .sort(function (a, b) { return b.sev - a.sev; })
    .slice(0, max || 6);
}

// Same checks side by side. Only the ones both sites were measured on.
function compare(theirs, comp) {
  const byId = {};
  comp.forEach(function (c) { byId[c.id] = c; });
  return theirs.filter(function (c) { return byId[c.id] && ['viewport', 'description', 'h1', 'schema', 'tel', 'form', 'https', 'title', 'alt'].indexOf(c.id) !== -1; })
    .map(function (c) { return { label: c.label, theirs: c.pass, comp: byId[c.id].pass }; });
}

module.exports = { checkSite, topProblems, compare, text };
