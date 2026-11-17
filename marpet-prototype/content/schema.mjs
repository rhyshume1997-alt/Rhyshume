// Shapes of the content files, and a check that runs on every build.
// To add a project, service or team member, edit the JSON in this folder and run `npm run build`.
// The build stops with a plain message if something is missing or misspelt.

/**
 * @typedef {Object} Company
 * @property {string} name
 * @property {string} phone
 * @property {string} phoneHref
 * @property {string} email
 * @property {string[]} address
 * @property {string[]} customers
 * @property {string|null} linkedin         Company page address, or null until confirmed
 * @property {string|null} enquiryEndpoint  Where the enquiry form posts, or null until a sending service exists
 * @property {string|null} turnstileSiteKey Cloudflare Turnstile site key (public), or null
 *
 * @typedef {Object} Service
 * @property {string} slug
 * @property {string} name
 * @property {string} short
 * @property {string} oldUrl     Page on the existing site, for the launch redirect
 * @property {'belt'|'line'|'pipe'|'steps'|'none'} motion
 * @property {string} lead
 * @property {string[]} body
 * @property {string[]} [list]
 * @property {string} [confirm]
 * @property {string} hero
 * @property {string[]} images
 *
 * @typedef {Object} Project
 * @property {string} slug
 * @property {string} title
 * @property {string} service    Slug of a service
 * @property {string} hero
 * @property {string[]} images
 * @property {string} [note]
 * @property {boolean} [featured]
 * @property {string} [overview]  Shown instead of the placeholder once supplied
 * @property {string} [scope]
 * @property {string} [client]    Only when approved for publication
 * @property {string} [date]
 *
 * @typedef {Object} TeamMember
 * @property {string|null} name
 * @property {string|null} role
 * @property {string|null} bio
 * @property {string|null} photo
 *
 * @typedef {Object} LinkedIn
 * @property {string|null} profileUrl
 * @property {{url: string|null, date: string|null, summary: string|null, image: string|null}[]} posts
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * @param {{company: Company, services: Service[], projects: Project[], team: TeamMember[], linkedin: LinkedIn, dims: Record<string, number[]>}} c
 * @returns {string[]} problems found; empty when the content is sound
 */
export function validateContent(c) {
  /** @type {string[]} */
  const out = [];
  const need = (ok, msg) => { if (!ok) out.push(msg); };
  const img = (file, where) => need(Boolean(c.dims[file]), `${where}: image "${file}" is not in site/assets/img`);
  const str = (v) => typeof v === 'string' && v.trim().length > 0;

  for (const k of ['name', 'phone', 'phoneHref', 'email']) need(str(c.company[k]), `company.json: "${k}" is missing`);
  need(Array.isArray(c.company.address) && c.company.address.length >= 3, 'company.json: "address" needs at least three lines');
  for (const k of ['linkedin', 'enquiryEndpoint']) {
    const v = c.company[k];
    need(v === null || /^https:\/\//.test(v) || (k === 'enquiryEndpoint' && /^\//.test(v)), `company.json: "${k}" must be null or a web address`);
  }

  const serviceSlugs = new Set();
  c.services.forEach((s, i) => {
    const at = `services.json item ${i + 1} (${s.slug || 'no slug'})`;
    need(SLUG.test(s.slug || ''), `${at}: "slug" must be lower case words joined by hyphens`);
    need(!serviceSlugs.has(s.slug), `${at}: slug is used twice`); serviceSlugs.add(s.slug);
    for (const k of ['name', 'short', 'oldUrl', 'lead', 'hero']) need(str(s[k]), `${at}: "${k}" is missing`);
    need(Array.isArray(s.body) && s.body.length > 0, `${at}: "body" needs at least one paragraph`);
    need(['belt', 'line', 'pipe', 'steps', 'none'].includes(s.motion), `${at}: "motion" is not one of belt, line, pipe, steps, none`);
    if (str(s.hero)) img(s.hero, at);
    (s.images || []).forEach((f) => img(f, at));
  });

  const projectSlugs = new Set();
  c.projects.forEach((p, i) => {
    const at = `projects.json item ${i + 1} (${p.slug || 'no slug'})`;
    need(SLUG.test(p.slug || ''), `${at}: "slug" must be lower case words joined by hyphens`);
    need(!projectSlugs.has(p.slug), `${at}: slug is used twice`); projectSlugs.add(p.slug);
    need(str(p.title), `${at}: "title" is missing`);
    need(serviceSlugs.has(p.service), `${at}: "service" must be the slug of a service`);
    need(str(p.hero), `${at}: "hero" is missing`);
    if (str(p.hero)) img(p.hero, at);
    (p.images || []).forEach((f) => img(f, at));
  });

  c.team.forEach((m, i) => {
    for (const k of ['name', 'role', 'bio', 'photo']) need(m[k] === null || str(m[k]), `team.json item ${i + 1}: "${k}" must be text or null`);
  });
  need(c.linkedin.profileUrl === null || /^https:\/\/([a-z]+\.)?linkedin\.com\//.test(c.linkedin.profileUrl), 'linkedin.json: "profileUrl" must be null or a linkedin.com address');
  c.linkedin.posts.forEach((p, i) => need(p.url === null || /^https:\/\/([a-z]+\.)?linkedin\.com\//.test(p.url), `linkedin.json post ${i + 1}: "url" must be null or a linkedin.com address`));
  return out;
}
