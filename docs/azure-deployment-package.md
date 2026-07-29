# Azure deployment package

Run the allowlist-based builder from any directory inside the repository:

```bash
scripts/build-azure-package.sh
```

The builder requires a clean Git working tree, stages only approved runtime files
under a fresh `/tmp` directory, validates and smoke-tests that staged copy, and
then creates these ignored local outputs:

- `build/deployment/kau-academic-planner-<commit>.zip`
- `build/deployment/kau-academic-planner-<commit>.manifest.json`

The ZIP contains only:

```text
server.js
azure-iisnode-entrypoint.js
package.json
web.config
data/validated/kau_accounting.json
web/index.html
web/styles.css
web/app.js
web/level-normalization.js
web/progress-migration.js
web/credit-display.js
web/elective-groups.js
web/data/kau_accounting.json
web/data/additional_programs.json
web/data/faculty_catalog.json
```

It excludes Git metadata, dependencies, Python code and environments, tests,
reports, raw captures, audit material, documentation, build scripts, local data,
databases, logs, caches, backups, credentials, Azure CLI state, publish profiles,
and existing archives. No dependency is introduced and `package-lock.json` is not
included.

The staged package is checked with Node syntax validation, JSON parsing, an exact
file allowlist, expected program counts and coverage states, and local HTTP/API
smoke tests covering all supported programs, representative read-only and
catalog-only programs, Accounting, Finance, the 20 imported programs, and the
elective-group browser module. Local `/.auth/me` returning 404 is expected when
Azure Easy Auth is absent.

The external JSON manifest records the source commit, UTC build timestamp,
artifact hash and size, program counts, and SHA-256/size metadata for every ZIP
member. ZIP metadata is normalized from the source commit, so rebuilding the same
clean commit produces the same ZIP bytes; only the external manifest timestamp is
intentionally variable.

Building the package does **not** deploy it and does not access Azure settings or
credentials. Any deployment requires separate explicit approval. Easy Auth is an
App Service configuration external to the ZIP.

`web.config` routes Windows IIS/iisnode through `azure-iisnode-entrypoint.js`.
iisnode loads the application through its interceptor, so the bootstrap starts
the server exported by `server.js` on the assigned named pipe. Direct local
startup remains `node server.js`. Before deployment, verify the actual production
App Service operating system, startup command, filesystem mode, and iisnode
availability. The server writes progress beneath `data/local`; that behavior may
be incompatible with a read-only run-from-package filesystem and must be resolved
before enabling that deployment mode.
