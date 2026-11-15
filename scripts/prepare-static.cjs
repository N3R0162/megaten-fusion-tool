// Generate host metadata after Angular has hashed its output.
'use strict';
const { readFileSync, writeFileSync, readdirSync, copyFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const out = resolve(root, 'dist/megaten-fusion-tool/browser');
const html = readFileSync(resolve(out, 'index.html'), 'utf8');
const base = html.match(/<base href="([^"]+)"/)[1];
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) {
  throw new Error('Use a root-relative base href ending in /, e.g. / or /megaten-fusion-tool/');
}
const mount = base.slice(0, -1);
const routing = readFileSync(resolve(root, 'src/app/app-routing.module.ts'), 'utf8');
const prefixes = new Set([...routing.matchAll(/path:\s*'([^']+)'/g)].map(m => m[1]).filter(p => /^[a-z0-9-]+$/.test(p)));
const languages = JSON.parse(readFileSync(resolve(root, 'src/app/compendium/data/translations.json'), 'utf8')).Languages.Languages;
for (const lang of languages) if (lang !== 'en') prefixes.add(lang);
// Restrict SPA rewrites to application routes. Missing JS/images must remain 404s.
const redirects = [...prefixes].flatMap(p => [
  `${base}${p} ${base}index.html 200`,
  `${base}${p}/* ${base}index.html 200`
]);
redirects.push(`${base}* ${base}404.html 404`);
writeFileSync(resolve(out, '_redirects'), redirects.join('\n') + '\n');
let headers = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

`;
// Do not overlap Cache-Control rules: Sevalla combines matching values.
for (const path of [base, `${base}index.html`, `${base}404.html`, `${base}home.html`, `${base}manifest.webmanifest`, `${base}ngsw.json`, `${base}ngsw-worker.js`, `${base}safety-worker.js`, `${base}worker-basic.min.js`]) {
  headers += `${path}\n  Cache-Control: public, max-age=0, must-revalidate\n\n`;
}
for (const p of prefixes) {
  headers += `${base}${p}\n  Cache-Control: public, max-age=0, must-revalidate\n\n${base}${p}/*\n  Cache-Control: public, max-age=0, must-revalidate\n\n`;
}
headers += `${base}assets/*\n  Cache-Control: public, max-age=3600\n\n${base}media/*\n  Cache-Control: public, max-age=31536000, immutable\n\n`;
for (const name of readdirSync(out).filter(n => /-[\w-]+\.(js|css)$/.test(n))) {
  headers += `${base}${name}\n  Cache-Control: public, max-age=31536000, immutable\n\n`;
}
writeFileSync(resolve(out, '_headers'), headers);
writeFileSync(resolve(out, '404.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title></head><body><h1>Page not found</h1><p><a href="${base}">Return to Megami Tensei Fusion Tools</a></p></body></html>\n`);
writeFileSync(resolve(out, 'home.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${base}home"><title>Megami Tensei Fusion Tools</title></head><body><a href="${base}home">Open fusion tools</a></body></html>\n`);
copyFileSync(resolve(root, 'LICENSE.md'), resolve(out, 'LICENSE.md'));
console.log(`Static site ready: ${out} (base ${base})`);
