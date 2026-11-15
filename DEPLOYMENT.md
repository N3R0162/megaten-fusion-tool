# Static deployment (Sevalla)

This is a browser-only Angular application. No backend, database, secrets or running
Node server are needed in production. Local browser storage holds user settings.
The application includes all supported games and the existing recipe-generator changes.

## Sevalla build strategy

Connect the Git repository containing this project and use:

| Setting | Value |
| --- | --- |
| Build site before publishing | On |
| Root directory | Empty if this repository starts with package.json; `megaten-fusion-tool` if uploading the parent Persona workspace |
| Node version | **22** (must resolve to 22.22.3 or newer) |
| Build command | `npm run build` |
| Publish directory | `dist/megaten-fusion-tool/browser` |
| Index file | `index.html` |
| Error file | Leave empty; the generated `_redirects` supplies proper 404 responses |
| Pretty URLs | Off |

Commit `package-lock.json` alongside `package.json`. Sevalla automatically installs
npm dependencies before running the build. Do not omit dev dependencies at build time:
Angular CLI and TypeScript compile the static output. Sevalla's dashboard Node setting
is required; Sevalla does not use `.nvmrc` or package.json engines to choose Node.

The build emits `_redirects` and `_headers` **inside the publish directory**. Known
application routes, including translated routes, rewrite to index.html; missing
assets and unknown paths remain 404s. Hashed bundles cache for a year; HTML and
route documents revalidate, and unhashed assets use a shorter browser cache.
No service worker is registered by the app; updating the deployment doesn't require
a service-worker migration. HTTPS is handled by Sevalla.

Only deploy the browser output, not the source tree, node_modules, or the unrelated
`aqiu384.github.io` project. Retain the bundled LICENSE.md and third-party licenses.

Official references:
- https://docs.sevalla.com/static-sites/build-settings
- https://docs.sevalla.com/static-sites/redirects
- https://docs.sevalla.com/static-sites/headers

## Local release verification

```sh
nvm use
npm ci
npm run test:ci
npm run build
npm run test:deployment
npm run preview
```

Visit http://127.0.0.1:4173/p4g/recipes and refresh. Also check persona tables,
select a target and skills, generate a recipe, and navigate between games.
`npm run preview` simulates the emitted host rules; it is a local verification tool,
not a production server. After deploying, repeat these checks on the Sevalla URL
and inspect response headers, since only the live host can confirm its edge behavior.

The initial JavaScript includes shared calculators; the existing 500 kB warning
budget currently reports about 540 kB uncompressed (about 160 kB transferred).
The 1 MB error budget remains enforced. Individual games are lazy-loaded.

## Subfolder hosting

Root hosting is the default. For a deliberate subfolder deployment:

```sh
npm run build -- --base-href /megaten-fusion-tool/
npm run test:deployment
```

The postbuild step derives redirects and headers from the compiled base href.
Mount the output at that URL prefix; a build flag alone doesn't move files into a
server subfolder. Use a trailing slash. Legacy `?csr=/p4g/personas` links continue
to work at either mount point. `BUILD_VERSION` optionally overrides the Git commit
shown on the loading-error page, and builds also work from archives without .git.

## Optional self-hosting with Nginx

From the project directory:

```sh
docker build -f docker/Dockerfile -t megaten-fusion-tool .
docker run --rm -p 8080:8080 megaten-fusion-tool
```

This serves the root build from Nginx on port 8080. The Docker path is optional and
is not used by Sevalla Static Sites. Node runs only in the build stage.
