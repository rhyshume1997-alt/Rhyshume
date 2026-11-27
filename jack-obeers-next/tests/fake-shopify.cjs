// A stand-in for the Shopify Storefront API, for tests only. Serves products with cursor pagination, stock numbers
// (quantityAvailable) and created dates. Never used by the live site.
const http = require('http');
const P = [];
let lastCart = null;
let vid = 1000;
const day = 86400000;
function add(title, type, vendor, tags, price, o = {}) {
  P.push({
    handle: 'p' + P.length, title, description: o.desc || '', productType: type, vendor, tags, featuredImage: null,
    createdAt: new Date(Date.now() - (o.ageDays ?? 400) * day).toISOString(),
    variants: { nodes: [{ id: 'gid://shopify/ProductVariant/' + (vid++), title: 'Default', availableForSale: o.avail !== false, price: { amount: price.toFixed(2) }, quantityAvailable: o.qty ?? 40 }] },
  });
}
add('VAULT CITY RASPBERRY SOUR 440ML ABV 4.5%', 'Beer', 'Vault City', ['Sour'], 4.5, { ageDays: 6, qty: 3, desc: 'Written in Shopify: tart raspberry, brewed in Glasgow.' });
add('VAULT CITY IRON BREW SOUR 440ML ABV 4.0%', 'Beer', 'Vault City', ['Sour'], 4.5, { ageDays: 9 });
add('OTHERWORLD BLOSSOM NEIPA 440ML ABV 6.2%', 'Beer', 'Otherworld', ['IPA'], 5.2, { qty: 5 });
add('ILKLEY JOSHUA JANE 500ML ABV 3.7%', 'Beer', 'Ilkley', ['Ale'], 3.9);
add('TWO TOWNS DOWN THESE STREETS 440ML ABV 4.6%', 'Beer', 'Two Towns Down', ['Pale Ale', 'Ale'], 4.1);
add('SVYTURYS EKSTRA PREMIUM LAGER 500ML ABV 5.0%', 'Beer', 'Svyturys', ['Lager'], 2.9, { qty: 6 });
add('AMITY WATERPISTOL 440ML ABV 4.6%', 'Beer', 'Amity', ['Pale Ale'], 4.2, { ageDays: 3 });
add('OTHERWORLD BA NYX 330ML ABV 9.0%', 'Beer', 'Otherworld', ['Porter'], 7.5, { ageDays: 12 });
add('MIDNIGHT STOUT 440ML ABV 6.0%', 'Beer', 'Dark Co', ['Stout'], 4.4);
add('SOLD OUT LAGER ABV 4.0%', 'Beer', 'Gone', ['Lager'], 3.0, { avail: false, qty: 0 });
for (let i = 0; i < 30; i++) add(`FILLER BEER ${i + 1} ${['LAGER', 'IPA', 'SOUR', 'STOUT'][i % 4]} 440ML ABV 4.${i % 9}%`, 'Beer', 'Filler Brewery', [['Lager', 'IPA', 'Sour', 'Stout'][i % 4]], 3 + (i % 5) * 0.5);
for (let i = 0; i < 6; i++) add(`ORCHARD CIDER ${i + 1} 500ML ABV 4.${i}%`, 'Hard Cider', 'Orchard Co', ['Cider'], 3.6);
for (let i = 0; i < 6; i++) add(`${['Rioja Red', 'Pinot Grigio', 'Prosecco'][i % 3]} Wine ${i + 1}`, 'Wine', 'Vineyard', [], 9 + i);
add('Award-winning pork pie', 'Deli', 'Jack O’Beers', [], 3.5);
add('Salami beer sticks', 'Deli', 'Jack O’Beers', [], 2.5);
add('Beer hamper', 'Hamper', 'Jack O’Beers', [], 40);
add('Deli hamper', 'Hamper', 'Jack O’Beers', [], 35);
for (let i = 0; i < 3; i++) add(`Tasting Night ${i + 1}`, 'Event Tickets', 'Jack O’Beers', ['date:2031-0' + (1 + i) + '-14', 'time:19:00'], 12.5, { desc: 'An evening of beer.' });
add('Draught Club: The Regular', 'Subscription Services', 'Jack O’Beers', [], 24.99);
// Draught products with size variants, only when FAKE_SIZES=1 (the test run sets it), so the default fake and the screenshots stay as they were.
// The first has 250ml, 500ml and 1 litre (the 250ml must never be offered online). The second has its 500ml sold out.
if (process.env.FAKE_SIZES) {
  const sized = (title, sizes) => P.push({
    handle: 'p' + P.length, title, description: '', productType: 'Beer', vendor: 'Size Test', tags: ['Lager'], featuredImage: null,
    createdAt: new Date(Date.now() - 400 * day).toISOString(),
    variants: { nodes: sizes.map(([t, price, avail, qty]) => ({ id: 'gid://shopify/ProductVariant/' + (vid++), title: t, availableForSale: avail, price: { amount: price.toFixed(2) }, quantityAvailable: qty })) },
  });
  sized('SIZE TEST DRAUGHT LAGER ABV 4.2%', [['250ml', 3, true, 7], ['500ml', 5.5, true, 7], ['1 litre', 9, true, 7]]);
  sized('SIZE TEST HALF SOLD OUT ABV 4.0%', [['500ml', 5.5, false, 0], ['1 litre', 9, true, 7]]);
  // Edge cases seen in the real shop's audit: an event with no date (a left-over sample), an expired event, a product with no variants
  // (Shopify can return one), and a product with no description, ABV, vendor, tags or image.
  add('Undated Sample Event', 'Event Tickets', 'Jack O’Beers', [], 0);
  add('Expired Test Night', 'Event Tickets', 'Jack O’Beers', ['date:2020-01-01', 'time:19:00'], 10);
  P.push({ handle: 'p' + P.length, title: 'EDGE NO VARIANTS ABV 4.0%', description: '', productType: 'Beer', vendor: '', tags: [], featuredImage: null, createdAt: new Date(Date.now() - 400 * day).toISOString(), variants: { nodes: [] } });
  add('EDGE NO INFO', 'Beer', '', [], 3.2);
}
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.method === 'GET' && req.url === '/__last-cart') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(lastCart)); return; }
    let q = {}; try { q = JSON.parse(body); } catch (e) {}
    // Shopify's cartCreate, as the site's checkout route calls it. The lines are kept so a test can read back what was handed over.
    if (/cartCreate/.test(q.query || '')) {
      lastCart = { lines: (q.variables && q.variables.lines) || [], attributes: (q.variables && q.variables.attributes) || [] };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ data: { cartCreate: { cart: { checkoutUrl: 'https://shop.test/checkouts/fake-' + lastCart.lines.length }, userErrors: [] } } }));
      return;
    }
    const start = q.variables && q.variables.cursor ? Number(q.variables.cursor) : 0;
    const slice = P.slice(start, start + 100);
    const end = start + slice.length;
    const wantsStock = /quantityAvailable/.test(q.query || '');
    const nodes = slice.map((p) => wantsStock ? { variants: { nodes: p.variants.nodes.map((v) => ({ id: v.id, quantityAvailable: v.quantityAvailable })) } }
      : { ...p, variants: { nodes: p.variants.nodes.map(({ quantityAvailable, ...v }) => v) } });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: { products: { pageInfo: { hasNextPage: end < P.length, endCursor: String(end) }, nodes } } }));
  });
}).listen(Number(process.env.FAKE_SHOPIFY_PORT || 4470), () => console.log('fake shopify up, products:', P.length));
