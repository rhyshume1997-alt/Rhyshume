---
name: web-app-ci
description: Sets up GitHub Actions CI for a SaaS or web app (Next.js, Vite, Remix, SvelteKit, Astro, Express, any Node project), modelled on openclaw's production CI. Detects the package manager and the scripts the project really has, then writes one workflow with lint, typecheck, test, build and optional Playwright and Postgres jobs behind a single required gate check. Use for "add CI", "set up GitHub Actions", "CI for my SaaS", "CI for this web app", "run tests on pull requests", "install the openclaw CI", "why is CI slow", "pin my actions", or when reviewing an existing workflow.
---

# Web app CI

Writes `.github/workflows/ci.yml` for a SaaS or web app from `templates/ci.yml`.

The template is a small version of openclaw's CI, kept in full at
`references/openclaw-ci.yml` (MIT, see `references/openclaw-LICENSE`; from
openclaw/openclaw at commit `a7d05c7`). **Never copy that file into a project.**
It is 7,400 lines, runs hourly, builds iOS, Android and macOS apps, and calls
scripts and actions that exist only in the openclaw repo. Read it for how a
large project solves a problem; ship the template.

## Steps

1. **Read the project before writing anything.**
   - Package manager, from the lockfile: `pnpm-lock.yaml`, `yarn.lock`,
     `bun.lock`/`bun.lockb`, else `package-lock.json`.
   - `scripts` in `package.json`: which of lint, typecheck, test, build and e2e
     exist, and under what names.
   - Node version: `.nvmrc`, `.node-version`, or `engines.node`. If none, use
     the current LTS and say so.
   - Whether tests need a database (Prisma, Drizzle, `DATABASE_URL` in test
     setup) and whether Playwright is installed.
   - Any existing workflow in `.github/workflows/`. Do not overwrite one
     without showing the person what changes.
   - If there is no `package.json` (a static site, another language), this
     template does not fit. Say so and write a workflow for what the repo has.

2. **Copy `templates/ci.yml` to `.github/workflows/ci.yml` and fill it in.**

   | Placeholder | npm | pnpm | yarn | bun |
   |---|---|---|---|---|
   | `__PM__` | `npm` | `pnpm` | `yarn` | remove the `cache:` line |
   | `__INSTALL__` | `npm ci` | `corepack enable && pnpm install --frozen-lockfile` | `corepack enable && yarn install --immutable` | `bun install --frozen-lockfile` |

   - With pnpm or yarn, `corepack enable` has to run *before* `setup-node`
     can cache. Add a `- run: corepack enable` step above each `setup-node`
     step and shorten `__INSTALL__` to the install command alone.
   - With bun, add `oven-sh/setup-bun` pinned to a commit SHA.
   - `__NODE_VERSION__`: the version found in step 1.
   - `__LINT__`, `__TYPECHECK__`, `__TEST__`, `__BUILD__`, `__E2E__`: the
     project's real script, such as `npm run lint`. If there is no typecheck
     script but there is a `tsconfig.json`, use `npx tsc --noEmit`.

3. **Delete what the project does not have.** A job with no script behind it
   is removed, not left to fail, and its name comes out of `ci-gate`'s `needs`.
   The Postgres block and the `e2e` job are marked `OPTION` … `END OPTION`:
   keep or delete each whole block, and delete the marker comments either way.

4. **Check it.** Parse the YAML. Confirm no `__` placeholder is left
   (`grep -n "__" .github/workflows/ci.yml`). Run each command locally once so
   the first CI run is not the first time anyone has run it. If `actionlint` is
   installed, run it.

5. **Tell the person the one manual step:** in the repository's branch
   protection, require the check named `ci-gate` and nothing else.

## Rules the template follows, and why

Each is taken from the openclaw workflow. Keep them when adapting.

- **`permissions: contents: read` at the top.** A job that needs more asks
  for it itself. A compromised dependency then cannot push or comment.
- **Actions pinned to a commit SHA, with the version in a comment.** A tag
  can be moved; a SHA cannot. The SHAs in the template are the ones openclaw
  pins. When updating one, take the SHA from the action's own release page.
- **`persist-credentials: false` on checkout.** The token is not left in
  `.git/config` for later steps to read.
- **`timeout-minutes` on every job.** A hung test costs minutes, not six hours.
- **Concurrency cancels the superseded run of a pull request**, never a run
  on main.
- **Draft pull requests run nothing.** `ready_for_review` is in the trigger
  types so CI starts when the draft is marked ready.
- **Docs-only changes skip the app jobs**, through `paths-ignore` on push and
  the preflight job on pull requests.
- **One gate job.** `ci-gate` needs every other job and runs with
  `if: always()`. Branch protection requires only it, so jobs can be added,
  removed or skipped without touching repository settings.
- **Frozen lockfile installs**, so CI tests what the lockfile says.
- **No secrets in CI for build and test.** Use placeholder values for public
  env vars. Deploys belong to the host (Vercel, Fly, Render), not this file.

## When the project outgrows the template

Look these up in `references/openclaw-ci.yml` rather than inventing them:

| Need | Where openclaw does it |
|---|---|
| Split a slow test suite into shards | `checks-node-core-test-nondist-shard`, `check-shard` (matrix with `fail-fast: false`) |
| Decide per change which jobs run | `preflight` and its outputs |
| Build once, reuse in later jobs | `build-artifacts`, with `upload-artifact` and `download-artifact` |
| Database tests across versions | `postgres-conformance` (images pinned by digest) |
| Browser tests against a real backend | `checks-ui-e2e`, `checks-ui-e2e-real-gateway` |
| Fast secret and dependency checks first | `security-fast` |
| Report why a pull request failed | `pr-failure-report` |
| Windows and macOS runs | `checks-windows`, `macos-node` |
