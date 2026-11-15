# Pre-deployment security review — 2026-11-15

Reviewed source commit: `3f182da54f22c2db02a630377dc0e6d8812281e1`, with the
local jsdom dependency fix in package.json and package-lock.json.
Deployment target: Sevalla Static Sites, publishing only
`dist/megaten-fusion-tool/browser`.

## Result

No deployment-blocking security issue was identified in this scoped review.
This is not a guarantee that the project is free of vulnerabilities.

- A clean `npm ci` installed 510 packages and audited 511 packages; npm reported
  **0 known vulnerabilities**, including development/build dependencies, at review time.
- Six Angular tests passed after the clean install.
- The production build and both deployment checks passed. The existing initial
  bundle-size warning is a performance warning, not a vulnerability finding.
- A pattern scan of currently tracked text files found no matching private keys,
  common provider tokens, or credential assignments. It did not inspect full Git history.
- No dist, node_modules, .env, or .aws files were tracked in the reviewed tree.
- The generated publish folder contained no source maps or Git/credential directories.
- Browser code review found no direct HTML injection APIs, eval/new Function,
  Angular sanitizer bypasses, or application API/upload endpoints in the checked source.
- The legacy query-link handler rejects protocol-relative and backslash routes.
  Deployment tests exercise valid links and an external-origin attempt.
- Generated security headers include nosniff, frame denial, referrer policy, and
  restricted camera/microphone/geolocation. Missing assets return 404, while valid
  application routes load the SPA. Production JavaScript is content-hashed.
- GitHub Actions uses contents:read permissions and does not deploy the site or
  receive any configured application secrets through the checked workflow.

## CI failure and fix

The failed GitHub run stopped at `npm run test:ci`, before the build. Angular's
Vitest runner could not find a DOM environment. `jsdom` is now an explicit
**development dependency**, with a matching updated lockfile. The clean-install
verification above passed locally. A new pushed run is still needed to confirm
GitHub-hosted execution; rerunning the old commit will not include the fix.

Run: https://github.com/N3R0162/megaten-fusion-tool/actions/runs/43720624193

## Nonblocking observations

- No Content-Security-Policy is currently configured. A policy would provide
  additional defense in depth, but must account for Angular-injected styles and
  the inline legacy-link script. Its absence is not evidence of an exploitable XSS.
- The settings service directly parses localStorage JSON and storage-event values
  (`configurable-fusion-data.service.ts`, lines 35 and 53). Malformed/cleared local
  settings can break a user's calculator view. This is a local robustness issue;
  no remote write mechanism to this storage was found in the app.

## Limits and go-live verification

The review covered current files, npm advisories, obvious browser injection sinks,
CI configuration, and generated static deployment behavior. It did not cover
full Git history, malicious-package analysis, exhaustive fuzzing, third-party
hosting/account permissions, or IP/licensing questions.

No deployed Sevalla URL was supplied. HTTPS enforcement, actual edge response
headers, and the configured publish directory remain unverified on the live host.
Do not publish the repository root or run the development/preview server as the
production service. Use Sevalla's static hosting and the documented publish folder.
