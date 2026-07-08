# Agent Notes

Bookshelf Relations is a single-package Node.js library for Bookshelf.js; read `README.md` for the public API and examples before changing behavior.

## Commands

- Use the pinned package manager: `pnpm install --frozen-lockfile`.
- Run `pnpm test:ci` for CI parity: it runs coverage with the 80% line/function/branch gates, then oxlint/oxfmt.
- Use `pnpm test` for the default sqlite test suite plus the `posttest` lint hook.
- Use `pnpm coverage` when you only need the coverage-gated sqlite test suite.
- Use `pnpm lint` for oxlint and oxfmt checks; `pnpm lint:fix` is the autofix path.
- Use `NODE_ENV=testing-mysql pnpm test` only when a local MySQL database is available.

## Test Configuration

- The default test environment is sqlite and writes `test.db`; leave that file untracked.
- MySQL tests use `config/env/config.testing-mysql.json`. Override nested values with double-underscore env vars, for example `database__connection__password=root`.
- CI runs the test matrix on Node 18, 20, and 22 against sqlite3 and MySQL, with a separate Node 22.23.1 lint job. Keep the `Required checks pass` aggregator as the stable required check.

## Repository Boundaries

- Do not replace pnpm with npm or Yarn. `packageManager` is pinned to pnpm 10 because the repo still supports Node 18.
- Keep `pnpm-workspace.yaml` even though this is not a workspace; it approves the native sqlite3 build script and disables optional `dtrace-provider` builds.
- Do not commit generated output: `node_modules/`, `coverage/`, `.nyc_output/`, `test.db`, or packed `*.tgz` files.
- Publishing is handled by `.github/workflows/publish.yml` with npm trusted publishing. Do not add npm tokens or token-based publish steps.

## Style

- JavaScript uses CommonJS, 4-space indentation, single quotes, and semicolons.
- `oxfmt` intentionally ignores JSON, YAML, Markdown, lockfiles, and coverage output; format those files by preserving local style.
- Relation behavior lives in `lib/plugin.js`, `lib/relations.js`, and `lib/detector.js`; update integration tests under `test/integration/` when changing relation semantics.
