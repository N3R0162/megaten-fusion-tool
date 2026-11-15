const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { preview } = require('./preview.cjs');
const out = resolve(__dirname, '../dist/megaten-fusion-tool/browser');
test('built site serves deep links, assets and deployment headers', async t => {
  const html = readFileSync(resolve(out, 'index.html'), 'utf8');
  const base = html.match(/<base href="([^"]+)"/)[1];
  assert.ok(!html.includes('$COMMIT_HASH'));
  assert.ok(!readdirSync(out).some(f => f.endsWith('.map')));
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (match[1] !== base && !/^https?:/.test(match[1])) assert.ok(existsSync(resolve(out, match[1])), match[1]);
  }
  const server = preview(out);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['', 'p4g/personas', 'p4g/recipes?target=Pixie', 'p5r/personas', 'ja/p4g/personas']) {
    const response = await fetch(origin + base + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    assert.equal(await response.text(), html);
  }
  const js = readdirSync(out).find(n => /^main-.+\.js$/.test(n));
  const asset = await fetch(origin + base + js);
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get('content-type'), 'application/javascript');
  assert.ok(asset.headers.get('cache-control').includes('immutable'));
  for (const path of ['missing.js', 'assets/missing.png', 'not-a-route']) {
    assert.equal((await fetch(origin + base + path)).status, 404, path);
  }
  assert.equal((await fetch(origin + base, { method: 'POST' })).status, 405);
});

test('legacy links preserve search and hash without misreading unrelated parameters', () => {
  const { runInNewContext } = require('node:vm');
  const html = readFileSync(resolve(out, 'index.html'), 'utf8');
  const base = html.match(/<base href="([^"]+)"/)[1];
  const script = html.match(/<script type="text\/javascript">([\s\S]*?)<\/script>/)[1];
  function restore(search) {
    let target;
    runInNewContext(script, {
      URL, URLSearchParams, document: { baseURI: `https://example.com${base}` },
      window: { location: { search, hash: '#skills' }, history: { replaceState: (_a, _b, url) => { target = url; } } }
    });
    return target;
  }
  assert.equal(restore('?csr=%2Fp4g%2Frecipes&target=Pixie'), `${base}p4g/recipes?target=Pixie#skills`);
  assert.equal(restore('?search=csr'), undefined);
  assert.equal(restore('?csr=%2F%2Fevil.example'), undefined);
});
