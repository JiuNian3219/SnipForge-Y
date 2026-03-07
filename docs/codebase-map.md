# Codebase Map

Reference for navigating the SnipForge codebase. Updated as the project grows.

## Directory Structure

```
SnipForge/
├── .claude/                         # Claude Code config + agent definitions
├── .github/workflows/
│   └── release.yml                  # CI: build + release on tag push (Win/Mac/Linux)
├── Command Bundles/                 # Pre-built snippet JSON files (not loaded by app)
├── docs/                            # Project documentation
├── electron/
│   ├── main/
│   │   ├── index.ts                 # Main process: window, tray, hotkey, all IPC handlers
│   │   ├── database.ts              # SQLite via better-sqlite3: schema, migrations, CRUD
│   │   └── github.ts                # GitHub OAuth device flow + remote library sync
│   ├── preload/
│   │   └── index.ts                 # contextBridge: exposes window.electronAPI to renderer
│   └── electron-env.d.ts            # Electron env type declarations
├── shared/
│   └── types.ts                     # Shared TypeScript interfaces (all processes import from here)
├── src/
│   ├── components/                  # Vue components (see below)
│   ├── utils/                       # Pure utility modules (see below)
│   ├── assets/
│   │   └── help.md                  # In-app help content (rendered in HelpModal)
│   ├── App.vue                      # Root component: all state, search, CRUD, layout
│   ├── main.ts                      # Vue entry: createApp(App).mount('#app')
│   └── vite-env.d.ts                # Vite client types
├── electron-builder.json5           # Build packaging config (targets, icons, artifact names)
├── index.html                       # HTML shell with CSP
├── tsconfig.json                    # Renderer TS config (strict, ESNext, DOM)
├── tsconfig.node.json               # Node-side TS config (electron/, vite.config.ts)
└── vite.config.ts                   # Vite + electron-plugin config
```

## Source Files

### Electron Main Process (`electron/main/`)

| File | Purpose |
|------|---------|
| `index.ts` | Creates BrowserWindow, system tray, registers global hotkey (`Cmd/Ctrl+Shift+Space`), defines all IPC handlers, manages app lifecycle (close-to-tray, single instance) |
| `database.ts` | SQLite layer: initializes DB, runs migrations (ALTER TABLE for new columns), CRUD for commands/libraries/auth, batch sync transactions |
| `github.ts` | GitHub Device Flow auth (start/poll), token encryption via `safeStorage`, GitHub REST API calls, library browse/subscribe/sync algorithm |

### Preload (`electron/preload/`)

| File | Purpose |
|------|---------|
| `index.ts` | `contextBridge.exposeInMainWorld('electronAPI', {...})` — typed wrappers around all IPC channels. Also declares `Window.electronAPI` global types |

### Shared (`shared/`)

| File | Purpose |
|------|---------|
| `types.ts` | Single source of truth for all interfaces: `Command`, `CommandWithTags`, `Library`, `RemoteCommand`, `LibraryManifest`, `SyncResult`, `GitHubUser`, `AuthStatus`, `CommandSource` |

### Vue Components (`src/components/`)

| Component | Purpose | Uses IPC? |
|-----------|---------|-----------|
| `CommandModal.vue` | Add/Edit command: language dropdown, tag autocomplete, routes to appropriate editor | No (emits to App.vue) |
| `CodeEditor.vue` | CodeMirror 6 wrapper for code languages; hot-swaps language via Compartment | No |
| `MarkdownEditor.vue` | CodeMirror 6 markdown editor with Bold/Italic/Link toolbar | No |
| `RichTextEditor.vue` | TipTap WYSIWYG (bold, lists, tasks, links, images) | No |
| `SettingsModal.vue` | Two tabs: "Libraries" (GitHub auth + subscription management) and "Manage Commands" (bulk export/import/delete) | Yes: `auth.*`, `library.*`, `file.*` |
| `DescriptionModal.vue` | Read-only markdown renderer for command descriptions | Yes: `shell.openExternal` |
| `VariableInputModal.vue` | Dynamic form for `{{variable}}` placeholders before copy | No (emits to App.vue) |
| `HelpModal.vue` | Renders `help.md` as sanitized HTML | No |
| `DuplicateResolutionModal.vue` | Import conflict resolution: skip vs replace | No (emits to App.vue) |
| `CommandList.vue` | Virtualized checkbox list (used in Manage Commands tab) | No |
| `TagSelector.vue` | Searchable tag picker with type-ahead filter | No |

### Utilities (`src/utils/`)

| File | Purpose |
|------|---------|
| `fuzzySearch.ts` | Fuse.js wrapper with cached instance; weighted search: title(2) > tags(1.5) > description(1) > body(0.5) |
| `tags.ts` | Tag foundation: `normalizeTag`, `getAllTags`, `filterCommandsByTags`, `suggestTags`, JSON parsing |
| `autocomplete.ts` | Cursor-aware inline ghost suggestions for tag inputs; handles `tag:` prefix in search |
| `searchParser.ts` | Parses `tag:git|title:ssh` structured queries into filters; `filterCommandsBySearch()` |
| `importExport.ts` | Export/import JSON v2.0 format, tag filtering, duplicate detection, validation with DoS guards |
| `variables.ts` | `extractVariables()`, `substituteVariables()`, `hasVariables()` for `{{variable name}}` templates |
| `theme.ts` | Hardcoded dark theme color constants, consumed by CodeMirror programmatic themes |

## Data Flow

```
┌──────────────────────────────────────────────────┐
│  MAIN PROCESS  (electron/main/)                  │
│                                                  │
│  database.ts ──┐                                 │
│  github.ts  ───┼── index.ts (IPC handlers)       │
│  Electron APIs ┘       │                         │
└────────────────────────┼─────────────────────────┘
                         │ ipcMain.handle / ipcRenderer.invoke
┌────────────────────────┼─────────────────────────┐
│  PRELOAD  (electron/preload/index.ts)            │
│                        │                         │
│  contextBridge ───► window.electronAPI           │
└────────────────────────┼─────────────────────────┘
                         │ window.electronAPI.*
┌────────────────────────┼─────────────────────────┐
│  RENDERER  (Vue 3 SPA)                           │
│                        ▼                         │
│  App.vue ─── calls electronAPI.database/clipboard│
│    ├── CommandModal ─── emits save ──► App.vue   │
│    ├── SettingsModal ── calls auth/library/file   │
│    ├── VariableInputModal ── emits values         │
│    ├── DescriptionModal ── calls shell            │
│    └── HelpModal, TagSelector, etc. (no IPC)     │
└──────────────────────────────────────────────────┘
```

**Push from Main → Renderer:**
- `window-shown` — fired when global hotkey shows window; App.vue resets search + focuses input

## IPC Channel Map

### Database

| Channel | Preload Method | Called From |
|---------|---------------|-------------|
| `db:getAllCommands` | `database.getAllCommands()` | App.vue `loadCommands()` |
| `db:updateCommand` | `database.updateCommand()` | App.vue `handleSaveCommand()` |
| `db:deleteCommand` | `database.deleteCommand()` | App.vue `deleteCommand()` |
| `db:addCommand` | `database.addCommand()` | App.vue `handleSaveCommand()` |

### Clipboard

| Channel | Preload Method | Called From |
|---------|---------------|-------------|
| `clipboard:writeText` | `clipboard.writeText()` | SettingsModal (copy device code) |
| `clipboard:write` | `clipboard.write()` | App.vue (copy with HTML for rich text) |
| `clipboard:readText` | `clipboard.readText()` | Available, not currently used |

### File Operations

| Channel | Preload Method | Called From |
|---------|---------------|-------------|
| `file:saveDialog` | `file.saveDialog()` | App.vue export flow |
| `file:openDialog` | `file.openDialog()` | App.vue import flow |
| `file:writeFile` | `file.writeFile()` | App.vue export flow |
| `file:readFile` | `file.readFile()` | App.vue import flow |

### Window Controls

| Channel | Preload Method | Called From |
|---------|---------------|-------------|
| `window:minimize` | `window.minimize()` | App.vue title bar (Windows) |
| `window:maximize` | `window.maximize()` | App.vue title bar (Windows) |
| `window:close` | `window.close()` | App.vue title bar (Windows) |
| `window:isMaximized` | `window.isMaximized()` | App.vue maximize state |
| `window:getPlatform` | `window.getPlatform()` | Available (platform detected sync) |

### GitHub Auth

| Channel | Preload Method | Called From |
|---------|---------------|-------------|
| `auth:login` | `auth.login()` | SettingsModal |
| `auth:pollLogin` | `auth.pollLogin()` | SettingsModal (polling loop) |
| `auth:logout` | `auth.logout()` | SettingsModal |
| `auth:getStatus` | `auth.getStatus()` | SettingsModal on open |

### Remote Libraries

| Channel | Preload Method | Called From |
|---------|---------------|-------------|
| `library:subscribe` | `library.subscribe()` | SettingsModal |
| `library:unsubscribe` | `library.unsubscribe()` | SettingsModal |
| `library:sync` | `library.sync()` | SettingsModal |
| `library:syncAll` | `library.syncAll()` | SettingsModal |
| `library:getAll` | `library.getAll()` | SettingsModal on open |
| `library:browse` | `library.browse()` | SettingsModal preview |

### Other

| Channel | Preload Method | Called From |
|---------|---------------|-------------|
| `shell:openExternal` | `shell.openExternal()` | DescriptionModal link clicks |
| `dialog:showInputDialog` | `dialog.showInputDialog()` | Available (superseded by VariableInputModal) |
| `window-shown` *(push)* | `onWindowShown(cb)` | App.vue — resets UI on hotkey |

## Database Schema

```sql
-- Core table
commands (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    description TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',           -- JSON array of strings
    language TEXT DEFAULT 'plaintext',
    source TEXT NOT NULL DEFAULT 'local',  -- 'local' | 'remote'
    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
    remote_path TEXT,                 -- filename in repo, e.g. "get-pods.json"
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)

-- Remote library subscriptions
libraries (
    id INTEGER PRIMARY KEY,
    github_repo TEXT NOT NULL UNIQUE, -- "org/repo-name"
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    last_synced_at TEXT,
    last_synced_sha TEXT,             -- commit SHA for change detection
    created_at TEXT NOT NULL
)

-- Encrypted token storage
auth (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)

-- Indices
idx_commands_title ON commands(title)
idx_commands_updated_at ON commands(updated_at DESC)
idx_commands_library_id ON commands(library_id)
idx_commands_source ON commands(source)
```

## Key Import Chains

```
shared/types.ts
├── electron/main/database.ts  (Command, Library, SyncResult)
├── electron/main/github.ts    (GitHubUser, LibraryManifest, RemoteCommand, SyncResult, Library)
├── electron/preload/index.ts  (Command, Library, SyncResult, AuthStatus, GitHubUser)
├── src/App.vue                (CommandWithTags)
├── src/utils/fuzzySearch.ts   (CommandWithTags)
└── src/utils/importExport.ts  (Command)

src/utils/tags.ts
├── src/utils/importExport.ts  (filterCommandsByTags, normalizeTags, tagsToJson)
├── src/utils/autocomplete.ts  (normalizeTag, suggestTags)
├── src/components/CommandModal.vue (getAllTags)
├── src/components/SettingsModal.vue (getAllTags)
└── src/App.vue                (getAllTags)

src/utils/theme.ts
├── src/components/CodeEditor.vue
└── src/components/MarkdownEditor.vue

electron/main/database.ts
└── electron/main/github.ts    (all DB operations for auth + libraries)
```
