// Static server for reviewing the prototype, including from a phone on the same Wi-Fi.
// Compresses responses (brotli or gzip) so loading figures are close to a real host.
//   node serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('./site/', import.meta.url));
const PORT = Number(process.argv[2]) || 4173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.exr': 'application/octet-stream', '.txt': 'text/plain' };
const COMPRESS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.glb', '.exr', '.txt']);
const cache = new Map();

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    const info = await stat(file);
    const ext = extname(file), accept = req.headers['accept-encoding'] || '';
    const enc = !COMPRESS.has(ext) ? '' : accept.includes('br') ? 'br' : accept.includes('gzip') ? 'gzip' : '';
    const key = file + enc + info.mtimeMs;
    let body = cache.get(key);
    if (!body) {
      const raw = await readFile(file);
      body = enc === 'br' ? brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }) : enc === 'gzip' ? gzipSync(raw, { level: 9 }) : raw;
      cache.set(key, body);
    }
    const head = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex, nofollow' };
    if (enc) head['Content-Encoding'] = enc;
    res.writeHead(200, head).end(req.method === 'HEAD' ? undefined : body);
  } catch (e) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Prototype on http://localhost:${PORT}/`);
  for (const list of Object.values(networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) console.log(`On your phone (same Wi-Fi): http://${n.address}:${PORT}/phone-test.html`);
});
