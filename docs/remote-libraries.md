# Remote Libraries

Remote Libraries let teams share command snippets via GitHub repositories. A curator maintains a repo with command files, and team members subscribe to pull those commands into their local SnipForge.

## How It Works

- **One-way sync**: repo -> app. Curators publish, members consume.
- **Local commands stay private**. Remote commands are tagged with their source and never mix with local ones.
- **Multi-repo support**. Subscribe to as many libraries as you need (e.g., `k8s-team`, `support-tools`, `dev-builds`).

## GitHub OAuth Setup

The app uses [GitHub Device Flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow) for authentication — the same flow as `gh auth login`. No client secret is embedded in the app.

### Creating the OAuth App

1. Go to [GitHub Developer Settings > OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: `SnipForge`
   - **Homepage URL**: your repo URL or any valid URL
   - **Authorization callback URL**: `http://localhost` (not used by Device Flow, but required by GitHub)
4. Click **Register application**
5. Copy the **Client ID**
6. Open `electron/main/github.ts` and set the `CLIENT_ID` constant to your Client ID

The `client_id` is public and safe to embed — no secret is needed for Device Flow.

### Scopes

The app requests the `repo` scope, which grants read/write access to repositories. This is needed to access private repos. For public-only libraries, `public_repo` would suffice, but `repo` covers both.

## Repo Structure (SnipForge Library)

Any GitHub repo can be a SnipForge library. It needs a `.snipforge.json` manifest and JSON command files anywhere in the same directory (or subdirectories):

```
my-team-commands/
├── .snipforge.json              # Library manifest (required)
├── get-pods.json                # Command files can be at any level
├── restart-deployment.json
└── networking/                  # Subdirectories are fine
    └── check-node-status.json
```

The manifest can also live in a subfolder of a larger repo (monorepo support):

```
my-monorepo/
├── src/
├── snipforge_library/
│   ├── .snipforge.json          # Scan is scoped to this directory
│   ├── get-pods.json
│   └── restart-deployment.json
└── package.json                 # Ignored — outside manifest scope
```

### Manifest (`.snipforge.json`)

```json
{
  "name": "Cloud Platform K8s Commands",
  "description": "Kubernetes maintenance commands for the cloud platform team",
  "format_version": "1.0"
}
```

### Command File (`get-pods.json`)

```json
{
  "title": "Get all pods in namespace",
  "body": "kubectl get pods -n {{namespace}}",
  "description": "Lists all running pods. Use `-o wide` for node info.",
  "tags": ["kubernetes", "pods"],
  "language": "bash",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-02-20T14:30:00Z"
}
```

One file per command means clean git diffs, meaningful history, and no merge conflicts.

## Architecture

### Token Storage

GitHub tokens are encrypted using Electron's `safeStorage` API before being stored in the local SQLite database (`auth` table). On systems where OS-level encryption isn't available, it falls back to base64 encoding.

### Database Schema

Two new tables and three new columns on `commands`:

```sql
-- New table: tracks library subscriptions
CREATE TABLE libraries (
    id INTEGER PRIMARY KEY,
    github_repo TEXT NOT NULL UNIQUE,   -- "org/repo-name"
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    last_synced_at TEXT,
    last_synced_sha TEXT,               -- commit SHA for change detection
    created_at TEXT NOT NULL
);

-- New table: encrypted token storage
CREATE TABLE auth (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- New columns on commands
ALTER TABLE commands ADD COLUMN source TEXT NOT NULL DEFAULT 'local';
ALTER TABLE commands ADD COLUMN library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;
ALTER TABLE commands ADD COLUMN remote_path TEXT;
```

- `source`: `'local'` (user's own) or `'remote'` (from a library)
- `library_id`: which library a remote command belongs to
- `remote_path`: filename in the repo (e.g., `get-pods.json`), used to detect updates/deletions

### Sync Algorithm

```
1. Fetch repo tree via GitHub API
2. Find .snipforge.json manifest (validate it's a SnipForge library)
3. Scope scan to the manifest's directory (monorepo safe)
4. Get latest commit SHA
5. If SHA matches last sync → skip (unless force sync from manual click)
6. Fetch all JSON files under the manifest directory, validate each (must have title + body)
7. Diff against local remote commands for this library:
   a. File exists remotely but not locally → ADD
   b. File exists both, remote updated_at > local → UPDATE
   c. File exists locally but not remotely → REMOVE
   d. Unchanged → SKIP
8. Execute all changes in a single SQLite transaction
9. Update library.last_synced_at and library.last_synced_sha
10. Return SyncResult { added, updated, removed, errors }
```

**Force sync**: When a user manually clicks "Sync", the SHA check is bypassed. This ensures locally deleted commands are re-downloaded. Auto-sync (Sync All) still uses SHA optimization.

### IPC Channels

**Auth:**
| Channel | Purpose |
|---------|---------|
| `auth:login` | Start Device Flow, returns `{ user_code, verification_uri, device_code }` |
| `auth:pollLogin` | Poll for token completion |
| `auth:logout` | Clear stored token |
| `auth:getStatus` | Check if authenticated, return user info |

**Libraries:**
| Channel | Purpose |
|---------|---------|
| `library:subscribe` | Add subscription + initial pull |
| `library:unsubscribe` | Remove library and its remote commands |
| `library:sync` | Pull latest for one library |
| `library:syncAll` | Pull latest for all libraries |
| `library:getAll` | List all subscriptions |
| `library:browse` | Preview library contents without subscribing |

### Key Files

| File | Purpose |
|------|---------|
| `electron/main/github.ts` | GitHub API client: auth, repo operations, sync |
| `electron/main/database.ts` | DB schema, migrations, library/auth CRUD |
| `electron/main/index.ts` | IPC handlers for auth + libraries |
| `electron/preload/index.ts` | Exposes auth + library channels to renderer |
| `shared/types.ts` | Shared types: Library, RemoteCommand, SyncResult, etc. |
| `src/components/SettingsModal.vue` | Libraries tab UI |

## Usage

### Subscribing to a Library

1. Open Settings (gear icon) > **Libraries** tab
2. Click **Sign in with GitHub** (first time only)
3. Enter the repo in the input field (e.g., `ArtluxDM/k8s-commands` or a full GitHub URL)
4. Click **Subscribe**
5. Commands appear in your main list with their source library

### Syncing

- Click the sync icon on an individual library to pull updates
- Click **Sync All** to update all subscriptions at once
- SHA-based detection skips repos that haven't changed

### Unsubscribing

Click the X button on a library. All remote commands from that library are removed. Your local commands are never affected.

## Phases

### Phase 1: Foundation (current)
Auth + subscribe + pull + unsubscribe. The core flow works end to end.

### Phase 2: Library Management UI
- Visual distinction between local/remote commands in the main list
- Filter commands by source/library
- Source indicators on command cards
- Exclude remote commands from local export

### Phase 3: Publishing (Curator Tools)
- Initialize a GitHub repo as a SnipForge library from the app
- Push individual commands to a library repo
- Remove commands from a library repo

### Phase 4: Polish
- Auto-check for updates (badge/notification)
- Browse library preview before subscribing
- Library search/discovery
