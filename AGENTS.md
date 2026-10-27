# Agent Notes

Bookshelf Relations is a single-package Node.js library for Bookshelf.js; read `README.md` for the public API and examples before changing behavior.

## Commands

- Use the pinned package manager: `pnpm install --frozen-lockfile`.
- Run `pnpm test:ci` for CI parity: it runs coverage with the line/function/branch/statement gates from `.nycrc.json`, then oxlint/oxfmt.
- Use `pnpm test` for the default sqlite test suite plus the `posttest` lint hook.
- Use `pnpm coverage` when you only need the coverage-gated sqlite test suite.
- Use `pnpm lint` for oxlint and oxfmt checks; `pnpm lint:fix` is the autofix path.
- Use `NODE_ENV=testing-mysql pnpm test` only when a local MySQL database is available.

## Test Configuration

- The default test environment is better-sqlite3 and writes `test.db`; leave that file untracked.
- Mocha spec globs, timeout and `--exit` live in `.mocharc.json`, shared by `pnpm test` and `pnpm coverage`; `pnpm perf` runs with `--no-config`. A file passed to `mocha` is appended to those globs, so run one spec with `pnpm exec mocha --no-config --timeout 10000 --exit <file>`.
- MySQL tests use `config/env/config.testing-mysql.json`. Override nested values with double-underscore env vars, for example `database__connection__password=root`.
- CI tests better-sqlite3 and MySQL. The Node test matrix and separate lint runtime are defined in `.github/workflows/test.yml`; library runtime support is declared in `package.json` `engines.node`. Keep the `Required checks pass` aggregator as the stable required check.

## Repository Boundaries

- Do not replace pnpm with npm or Yarn. Use the version pinned in `package.json` `packageManager`.
- Keep `pnpm-workspace.yaml` even though this is not a workspace; it approves the native better-sqlite3 build script and disables optional `dtrace-provider` builds.
- Do not commit generated output: `node_modules/`, `coverage/`, `.nyc_output/`, `test.db`, or packed `*.tgz` files.
- Publishing is handled by `.github/workflows/publish.yml` with npm trusted publishing. Do not add npm tokens or token-based publish steps.

## Style

- JavaScript uses CommonJS, 4-space indentation, single quotes, and semicolons.
- `oxfmt` intentionally ignores JSON, YAML, Markdown, lockfiles, and coverage output; format those files by preserving local style.
- Relation behavior lives in `lib/plugin.js`, `lib/relations.js`, and `lib/detector.js`; update integration tests under `test/integration/` when changing relation semantics.
- `test/integration/public-boundary_spec.js` covers the README-documented API (entrypoint, plugin options, manual mode); extend it when changing public behavior. Coverage thresholds in `.nycrc.json` only ratchet up.
