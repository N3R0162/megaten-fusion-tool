// Local preview of the built files and the generated Sevalla routing/header rules.
'use strict';
const { createServer } = require('node:http');
const { readFileSync, statSync, createReadStream } = require('node:fs');
const { resolve, sep, extname } = require('node:path');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8' };
function match(pattern, path) {
  return new RegExp('^' + pattern.split('*').map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(path);
}
function preview(directory) {
  const root = resolve(directory);
  const base = readFileSync(resolve(root, 'index.html'), 'utf8').match(/<base href="([^"]+)"/)[1];
  const rules = readFileSync(resolve(root, '_redirects'), 'utf8').trim().split('\n').map(l => l.split(/\s+/));
  const headers = [];
  for (const line of readFileSync(resolve(root, '_headers'), 'utf8').split('\n')) {
    if (line.startsWith('/')) headers.push({ pattern: line, values: {} });
    else if (line.trim() && !line.startsWith('#')) {
      const at = line.indexOf(':');
      if (at !== -1) headers.at(-1).values[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
  }
  const fileFor = path => {
    if (!path.startsWith(base)) return null;
    const file = resolve(root, path.slice(base.length) || 'index.html');
    if (!file.startsWith(root + sep)) return null;
    try { return statSync(file).isFile() ? file : null; } catch { return null; }
  };
  return createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); res.end(); return; }
    let file = fileFor(path), status = 200;
    if (!file) {
      const rule = rules.find(([pattern]) => match(pattern, path));
      if (rule) { file = fileFor(rule[1]); status = Number(rule[2]); }
    }
    if (!file) { res.writeHead(404); res.end('Not found'); return; }
    const responseHeaders = { 'Content-Type': types[extname(file)] || 'application/octet-stream' };
    for (const h of headers) if (match(h.pattern, path)) Object.assign(responseHeaders, h.values);
    res.writeHead(status, responseHeaders);
    if (req.method === 'HEAD') res.end(); else createReadStream(file).pipe(res);
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  preview(resolve(__dirname, '../dist/megaten-fusion-tool/browser')).listen(port, '127.0.0.1', () => {
    console.log(`Production preview: http://127.0.0.1:${port}`);
  });
}
module.exports = { preview };
