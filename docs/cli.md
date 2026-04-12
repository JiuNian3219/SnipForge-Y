# CLI

## What This Is

CLI v1 gives SnipForge a terminal-native path for library-backed commands. It reads command JSON files directly from a SnipForge library folder, supports search/list flows, and can copy a selected command to the system clipboard without launching the Electron app.

**GitHub Issue:** #31

## Scope

- Read manifest + command JSON files from a local SnipForge library folder
- Support terminal `list`, `search`, and `copy` flows
- Keep runtime independent from Electron
- Refuse copy for commands that still require variable substitution

## Non-goals

- Executing commands from the CLI
- Full parity with the desktop variable modal
- Using SQLite as the CLI source of truth
- Cross-library discovery in v1

## Plan

- [x] Add a small Node CLI entrypoint with `list`, `search`, and `copy`
- [x] Default to the current working directory when it contains a SnipForge library, with `--library` override support
- [x] Reuse SnipForge command-file semantics for parsing and filtering
- [x] Add regression coverage for command loading, search ranking, and copy guardrails
- [x] Document usage and current limitations

## Usage Shape

```bash
node bin/snipforge.mjs list
node bin/snipforge.mjs search kubectl
node bin/snipforge.mjs copy kubectl rollout
node bin/snipforge.mjs copy --id 11111111-1111-4111-8111-111111111111
node bin/snipforge.mjs search docker --library ~/commands/the-armory
```

The package also exposes `pnpm cli -- ...` in local development.

## Current Behavior

- `list` prints the current library contents with rank, short id, tags, and description
- `search` uses fuzzy matching over title, tags, description, and body
- `copy` copies the best search match, or an exact command `id` when `--id` is supplied
- `copy` rejects commands containing `{{variables}}` because v1 intentionally avoids desktop-style substitution flows
- The CLI only reads one explicit local library root in v1

## Open Questions

- Whether v2 should support shell completion and interactive selection
- Whether the CLI should eventually search multiple configured libraries instead of a single explicit root

## Dev Log

| Date | What |
|------|------|
| 2026-04-11 | Planned CLI v1 around direct library-file reads, terminal search/list flows, and clipboard copy for non-variable commands |
| 2026-04-11 | Implemented `bin/snipforge.mjs` with `list`, `search`, and `copy`, added `pnpm cli -- ...`, and covered library loading + copy guardrails in tests |

---

## TypeScript Indexer MVP

**GitHub Issue:** #30

## Scope

- Crawl a local TypeScript repository on demand from the CLI
- Extract exported functions, interfaces, and type aliases using the TypeScript AST
- Generate or update a local SnipForge library from the crawl result
- Preserve source-location metadata in the generated command content

## Non-goals

- Live file watching
- JavaScript support in the MVP
- Indexing non-exported implementation details
- Full semantic analysis across package boundaries

## Plan

- [x] Add a CLI command for indexing a TypeScript repository into a SnipForge library
- [x] Walk `.ts` and `.tsx` files while skipping generated and dependency folders
- [x] Extract supported exported declarations with stable output ids/paths so reruns update instead of duplicating
- [x] Remove stale generated entries from previous runs without touching unrelated library files
- [x] Add regression coverage for extraction, output generation, and rerun cleanup

## Intended Usage Shape

```bash
node bin/snipforge.mjs index-ts ~/work/my-repo
node bin/snipforge.mjs index-ts ~/work/my-repo --out ~/commands/my-repo-index
pnpm cli -- index-ts ~/work/my-repo --out ./The\\ Armory/my-repo-index
```

## Current Behavior

- `index-ts` crawls `.ts` and `.tsx` files, skipping dependency/build folders like `node_modules`, `.git`, `dist`, and `build`
- The indexer extracts exported functions, interfaces, type aliases, and exported function-valued `const` declarations using the TypeScript AST
- Generated command files include stable ids, deterministic filenames, and `source_location` metadata with file + line information
- Re-running against the same output library updates existing generated entries and removes stale generated files tracked by `.snipforge-index.json`
- `pnpm cli -- index-ts ...` works directly, so the package script path matches the documented usage

## Verification

- `pnpm exec vitest run tests/ts-indexer.test.ts tests/cli.test.ts`
- `pnpm exec vue-tsc --noEmit`
- `pnpm cli -- index-ts . --out /tmp/<generated-dir>`

## Dev Log

| Date | What |
|------|------|
| 2026-04-12 | Added `index-ts` to the CLI, implemented AST-backed export extraction for TypeScript repos, generated stable SnipForge libraries with rerun cleanup, and covered the flow with targeted tests + a real CLI smoke run |
