# Database Schema

Single source of truth for the SnipForge data model. When a feature adds or modifies columns/tables, update this file in the same commit.

**Engine:** SQLite via better-sqlite3 (synchronous, WAL mode)
**Location:** `{userData}/snipforge.db` (Electron's `app.getPath('userData')`)
**Implementation:** `electron/main/database.ts`
**Types:** `shared/types.ts`

---

## Tables

### commands

Derived command index/cache. Every command that SnipForge can search is projected here, but this table is **not** the canonical source of truth for library-backed commands.

- library-backed command content lives in JSON files inside libraries
- this table stores the indexed projection used for search/listing plus temporary legacy DB-only commands that have not been migrated yet
- deleting or rebuilding SQLite must not delete commands that still exist in initialized libraries

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER | PK, auto | |
| `title` | TEXT | NOT NULL | Command name shown in the list |
| `body` | TEXT | NOT NULL | The command/snippet content |
| `description` | TEXT | `''` | Optional description, supports markdown |
| `tags` | TEXT | `'[]'` | JSON array of strings |
| `language` | TEXT | `'plaintext'` | Editor type: `plaintext`, `richtext`, `markdown`, or a code language (`javascript`, `python`, `bash`, etc.) |
| `source` | TEXT | `'local'` | `'local'` = legacy DB-only command row, `'remote'` = indexed projection of a library-backed command |
| `library_id` | INTEGER | NULL | FK → `libraries.id` (ON DELETE CASCADE). Set for library-backed indexed rows, NULL for legacy DB-only rows. |
| `remote_path` | TEXT | NULL | Relative command file path inside the library (for example `get-pods.json`). Used to reconcile indexed rows with filesystem state. |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 timestamp |

**Indices:**
- `idx_commands_title` — on `title`
- `idx_commands_updated_at` — on `updated_at DESC`
- `idx_commands_library_id` — on `library_id`
- `idx_commands_source` — on `source`

**Behaviors:**
- Writable local-library commands are created, edited, and deleted on disk first, then reindexed into this table.
- Read-only library commands are never edited in-place in SQLite; editing duplicates them into the default writable local library instead.
- Legacy DB-only rows (`source = 'local'`, `library_id IS NULL`, `remote_path IS NULL`) remain only as upgrade compatibility until migrated into a library.
- Deleting a library cascades: all indexed command rows with that `library_id` are removed.

### libraries

Library registry and sync metadata. This table tracks both writable local libraries and origin-backed/read-only libraries.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | INTEGER | PK, auto | |
| `github_repo` | TEXT | NOT NULL, UNIQUE | Repo identifier, e.g., `ArtluxDM/k8s-commands` |
| `name` | TEXT | NOT NULL | Display name from the manifest |
| `description` | TEXT | `''` | From the manifest |
| `manifest_path` | TEXT | NULL | Path to `.snipforge.json` in the repo (NULL = not initialized) |
| `last_synced_at` | TEXT | NULL | ISO 8601 timestamp of last successful sync |
| `last_synced_sha` | TEXT | NULL | Content hash / sync marker for the last successful reindex or origin sync |
| `origin_url` | TEXT | NULL | Canonical origin repo URL when this library is backed by a GitHub origin |
| `origin_ref` | TEXT | NULL | Preferred origin branch/ref when known |
| `auto_sync` | INTEGER | `0` | Per-library auto-sync toggle (0 = off, 1 = on) |
| `permission` | TEXT | `'consumer'` | User's role: `'owner'`, `'curator'`, or `'consumer'` |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |

### auth

Encrypted token storage. Tokens are encrypted via Electron's `safeStorage` API before writing.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | TEXT | PK | Token identifier (e.g., `github_token`) |
| `value` | TEXT | NOT NULL | Encrypted token value |

---

## Migrations

Migrations are inline in `database.ts:initializeDatabase()`. Each uses a try/catch `ALTER TABLE` pattern — if the column already exists, the error is silently caught. This is safe because SQLite's `ALTER TABLE ADD COLUMN` is idempotent in effect (fails if exists, no partial state).

**Migration history:**
1. `description` column on `commands` (v1 → v2)
2. `language` column on `commands` (v2 → v3)
3. `source`, `library_id`, `remote_path` columns on `commands` + `libraries` table + `auth` table (v3 → v4, Phase 1 Remote Libraries)
4. `manifest_path` column on `libraries` (v4 → v5, Phase 3 Publishing)
5. `type` column on `libraries` (v5 → v6, Phase 4 Local Libraries)
6. `origin_url` / `origin_ref` columns on `libraries` (working-copy/origin metadata follow-up)
7. `auto_sync` column on `libraries` (Settings Phase 2)
8. `permission` column on `libraries` (Phase 5 Permissions)

When adding new columns, follow the same pattern: `ALTER TABLE ... ADD COLUMN` wrapped in try/catch, placed after the existing migrations in `initializeDatabase()`.

---

## TypeScript Types

All types live in `shared/types.ts` and are shared between Main and Renderer processes.

| Type | Used for |
|------|----------|
| `Command` | Full command row from DB |
| `CommandWithTags` | Command with pre-parsed `tagsArray` and `tagsNormalized` (renderer only) |
| `CommandSource` | `'local' \| 'remote'` |
| `Library` | Library subscription row |
| `RemoteCommand` | Command as parsed from a repo JSON file (before DB insertion) |
| `LibraryManifest` | `.snipforge.json` manifest contents |
| `SyncResult` | Return value from sync operations: `{ added, updated, removed, errors }` |
| `GitHubUser` | GitHub user info from auth |
| `AuthStatus` | Auth state: `{ authenticated, user }` |
| `DeviceFlowResponse` | GitHub Device Flow initial response |
