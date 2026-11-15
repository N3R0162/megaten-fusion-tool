'use strict';
const { readFileSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
let version = process.env.BUILD_VERSION || process.env.GITHUB_SHA || 'local';
if (version === 'local') {
  try {
    version = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root, stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
  } catch { /* Source archives and container builds may not include Git metadata. */ }
}
// This value is embedded in HTML; accept only a small, safe version identifier.
version = version.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64) || 'local';
const template = readFileSync(resolve(root, 'src/index.html'), 'utf8');
writeFileSync(resolve(root, 'src/index.prod.html'), template.replaceAll('$COMMIT_HASH', version));
