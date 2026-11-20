'use strict';
/* Fixture websites for package A tests (fictional, local only). Not a test file. */
const NAV = '<nav><a href="/">Home</a> <a href="/services">Services</a> <a href="/services/cnc-machining">CNC machining</a> <a href="/about">About</a> <a href="/contact">Contact</a></nav>';

function good(host) {
  const title = 'Harbour Precision | CNC machining in Glasgow';
  return {
    '/': { body: '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>' + title + '</title><meta name="description" content="Precision CNC machining for engineering firms in Glasgow and the west of Scotland. Prototype to batch production, with drawings checked before we cut."><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="http://' + host + '/">' +
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Harbour Precision","url":"http://' + host + '/"}</script></head><body><header>' + NAV + '</header><main><h1>Precision CNC machining in Glasgow</h1><h2>What we make</h2><p>Brackets, shafts and housings.</p><h2>How to start</h2><p><a href="mailto:hello@harbourprecision.example">Email us</a> or call <a href="tel:+441410000000">0141 000 0000</a>.</p><a href="/missing-page">Old brochure</a><a href="/contact">Request a quote</a></main></body></html>' },
    '/services': { body: '<html><head><title>Services</title></head><body><h1>Services</h1><a href="/services/cnc-machining">CNC machining</a><a href="/services/turning">CNC turning</a><a href="/services/fabrication">Fabrication</a></body></html>' },
    '/services/cnc-machining': { body: '<html><head><title>CNC machining</title></head><body><h1>CNC machining</h1></body></html>' },
    '/services/turning': { body: '<html><head><title>Turning</title></head><body><h1>Turning</h1></body></html>' },
    '/services/fabrication': { body: '<html><head><title>Fabrication</title></head><body><h1>Fabrication</h1></body></html>' },
    '/about': { body: '<html><head><title>About</title></head><body><h1>About</h1></body></html>' },
    '/contact': { body: '<html><head><title>Contact</title></head><body><h1>Contact</h1><form action="/send" method="post"><input type="email" name="email"><textarea name="message"></textarea></form></body></html>' },
    '/robots.txt': { headers: { 'Content-Type': 'text/plain' }, body: 'User-agent: *\nAllow: /\nDisallow: /private\nSitemap: http://' + host + '/sitemap.xml\n' },
    '/sitemap.xml': { headers: { 'Content-Type': 'application/xml' }, body: '<?xml version="1.0"?><urlset><url><loc>http://' + host + '/</loc></url><url><loc>http://' + host + '/services</loc></url><url><loc>http://' + host + '/about</loc></url><url><loc>http://' + host + '/contact</loc></url><url><loc>http://' + host + '/services/turning</loc></url></urlset>' }
  };
}

function poor() {
  return {
    '/': { body: '<html><body><h1>Welcome</h1><h1>Welcome again</h1><h3>Skipped level</h3><script type="application/ld+json">{"@type": "LocalBusiness", broken</script><a href="/gone1">a</a><a href="/gone2">b</a><a href="/gone3">c</a><a href="/gone4">d</a></body></html>' },
    '/robots.txt': { status: 404, body: 'nope' }
  };
}

module.exports = { good, poor, NAV };
