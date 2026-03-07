import { safeStorage } from 'electron'
import * as db from './database'
import type { GitHubUser, LibraryManifest, RemoteCommand, SyncResult, Library } from '../../shared/types'

// ── Configuration ─────────────────────────────────────────────────
// GitHub OAuth App client_id (public — safe to embed, no secret needed)
// TODO: Replace with your actual GitHub OAuth App client_id
const CLIENT_ID = 'Ov23liUzEMqcz42aCKBn'
const GITHUB_API = 'https://api.github.com'
const DEVICE_CODE_URL = 'https://github.com/login/device/code'
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'

// ── Token Management ──────────────────────────────────────────────

function encryptToken(token: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
        // Fallback: base64 (better than plaintext, but not truly secure)
        return Buffer.from(token).toString('base64')
    }
    return safeStorage.encryptString(token).toString('base64')
}

function decryptToken(encrypted: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
        return Buffer.from(encrypted, 'base64').toString('utf8')
    }
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
}

function getStoredToken(): string | null {
    const encrypted = db.getAuthValue('github_token')
    if (!encrypted) return null
    try {
        return decryptToken(encrypted)
    } catch {
        // Token corrupted, clear it
        db.deleteAuthValue('github_token')
        return null
    }
}

function storeToken(token: string): void {
    const encrypted = encryptToken(token)
    db.setAuthValue('github_token', encrypted)
}

function clearToken(): void {
    db.deleteAuthValue('github_token')
}

// ── GitHub API Helpers ────────────────────────────────────────────

async function githubFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = getStoredToken()
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers as Record<string, string>,
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const url = path.startsWith('https://') ? path : `${GITHUB_API}${path}`
    return fetch(url, { ...options, headers })
}

// ── Auth: Device Flow ─────────────────────────────────────────────

// State for the active polling session
let deviceFlowInterval: string | null = null

export interface DeviceFlowInit {
    user_code: string
    verification_uri: string
    device_code: string
    expires_in: number
    interval: number
}

export async function startDeviceFlow(): Promise<DeviceFlowInit> {
    const res = await fetch(DEVICE_CODE_URL, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: CLIENT_ID,
            scope: 'repo',
        }),
    })

    if (!res.ok) {
        throw new Error(`Device Flow init failed: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    deviceFlowInterval = data.device_code
    return data
}

export async function pollDeviceFlow(deviceCode: string): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    const res = await fetch(ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: CLIENT_ID,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
    })

    const data = await res.json()

    if (data.error === 'authorization_pending') {
        return { success: false, error: 'authorization_pending' }
    }

    if (data.error === 'slow_down') {
        return { success: false, error: 'slow_down' }
    }

    if (data.error === 'expired_token') {
        return { success: false, error: 'expired_token' }
    }

    if (data.error) {
        return { success: false, error: data.error_description || data.error }
    }

    if (data.access_token) {
        // Store the token securely
        storeToken(data.access_token)

        // Fetch user info
        const user = await getAuthenticatedUser()
        return { success: true, user: user ?? undefined }
    }

    return { success: false, error: 'Unknown error' }
}

export async function getAuthenticatedUser(): Promise<GitHubUser | null> {
    const token = getStoredToken()
    if (!token) return null

    try {
        const res = await githubFetch('/user')
        if (!res.ok) return null
        const data = await res.json()
        return {
            login: data.login,
            avatar_url: data.avatar_url,
            name: data.name,
        }
    } catch {
        return null
    }
}

export async function getAuthStatus(): Promise<{ authenticated: boolean; user: GitHubUser | null }> {
    const token = getStoredToken()
    if (!token) return { authenticated: false, user: null }

    const user = await getAuthenticatedUser()
    if (!user) {
        // Token is invalid, clear it
        clearToken()
        return { authenticated: false, user: null }
    }

    return { authenticated: true, user }
}

export function logout(): void {
    clearToken()
}

// ── Repo Operations ───────────────────────────────────────────────

function parseRepoUrl(input: string): { owner: string; repo: string } {
    // Accept formats: "owner/repo", "https://github.com/owner/repo", etc.
    let cleaned = input.trim()

    // Strip trailing .git
    if (cleaned.endsWith('.git')) {
        cleaned = cleaned.slice(0, -4)
    }

    // Full URL
    const urlMatch = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (urlMatch) {
        return { owner: urlMatch[1], repo: urlMatch[2] }
    }

    // owner/repo format
    const parts = cleaned.split('/')
    if (parts.length === 2 && parts[0] && parts[1]) {
        return { owner: parts[0], repo: parts[1] }
    }

    throw new Error(`Invalid repo format: "${input}". Use "owner/repo" or a GitHub URL.`)
}

async function getRepoDefaultBranch(owner: string, repo: string): Promise<string> {
    const res = await githubFetch(`/repos/${owner}/${repo}`)
    if (!res.ok) {
        if (res.status === 404) throw new Error(`Repository not found: ${owner}/${repo}`)
        if (res.status === 403) throw new Error('Access denied. Check your GitHub permissions.')
        throw new Error(`GitHub API error: ${res.status}`)
    }
    const data = await res.json()
    return data.default_branch || 'main'
}

async function getLatestCommitSha(owner: string, repo: string, branch: string): Promise<string> {
    const res = await githubFetch(`/repos/${owner}/${repo}/commits/${branch}`)
    if (!res.ok) throw new Error(`Failed to get latest commit: ${res.status}`)
    const data = await res.json()
    return data.sha
}

async function getRepoTree(owner: string, repo: string, branch: string): Promise<Array<{ path: string; type: string; sha: string }>> {
    const res = await githubFetch(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`)
    if (!res.ok) throw new Error(`Failed to get repo tree: ${res.status}`)
    const data = await res.json()
    return data.tree || []
}

async function getFileContent(owner: string, repo: string, filePath: string, branch: string): Promise<string> {
    const res = await githubFetch(`/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`)
    if (!res.ok) throw new Error(`Failed to get file: ${filePath} (${res.status})`)
    const data = await res.json()

    if (data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf8')
    }

    return data.content
}

// ── Library Operations ────────────────────────────────────────────

export async function browseLibrary(repoUrl: string): Promise<{ manifest: LibraryManifest; commands: Array<{ path: string; command: RemoteCommand }> }> {
    const { owner, repo } = parseRepoUrl(repoUrl)
    const branch = await getRepoDefaultBranch(owner, repo)
    const tree = await getRepoTree(owner, repo, branch)

    // Find the manifest anywhere in the repo
    const manifestFile = tree.find(f =>
        f.path.endsWith('.snipforge.json') &&
        f.type === 'blob'
    )
    if (!manifestFile) {
        throw new Error('Not a SnipForge library — missing .snipforge.json manifest')
    }

    const manifestContent = await getFileContent(owner, repo, manifestFile.path, branch)
    const manifest = JSON.parse(manifestContent) as LibraryManifest

    // Scope scan to the manifest's directory — avoids scanning unrelated files in monorepos
    const manifestDir = manifestFile.path.includes('/')
        ? manifestFile.path.substring(0, manifestFile.path.lastIndexOf('/') + 1)
        : '' // root — scan the whole repo

    const candidateFiles = tree.filter(f =>
        f.path.endsWith('.json') &&
        f.type === 'blob' &&
        f.path !== manifestFile.path &&
        f.path.startsWith(manifestDir) &&
        !f.path.includes('node_modules/') &&
        !f.path.includes('.vscode/')
    )

    // Fetch and validate each file against the command schema
    const commands: Array<{ path: string; command: RemoteCommand }> = []
    for (const file of candidateFiles) {
        try {
            const content = await getFileContent(owner, repo, file.path, branch)
            const parsed = JSON.parse(content)

            // Validate: must have title (string) and body (string) at minimum
            if (
                typeof parsed.title === 'string' && parsed.title.trim() &&
                typeof parsed.body === 'string' && parsed.body.trim()
            ) {
                const command: RemoteCommand = {
                    title: parsed.title,
                    body: parsed.body,
                    description: parsed.description || '',
                    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
                    language: parsed.language || 'plaintext',
                    created_at: parsed.created_at || new Date().toISOString(),
                    updated_at: parsed.updated_at || new Date().toISOString(),
                }
                commands.push({ path: file.path, command })
            }
        } catch {
            // Not valid JSON or not a command — skip silently
        }
    }

    return { manifest, commands }
}

export async function subscribeToLibrary(repoUrl: string): Promise<{ library: Library; syncResult: SyncResult }> {
    const { owner, repo } = parseRepoUrl(repoUrl)
    const githubRepo = `${owner}/${repo}`

    // Check if already subscribed
    const existing = db.getLibraryByRepo(githubRepo)
    if (existing) {
        throw new Error(`Already subscribed to ${githubRepo}`)
    }

    // Browse the library to validate it and get commands
    const { manifest, commands } = await browseLibrary(repoUrl)

    // Get the latest commit SHA for change detection
    const branch = await getRepoDefaultBranch(owner, repo)
    const sha = await getLatestCommitSha(owner, repo, branch)

    // Create the library record
    const libraryId = db.addLibrary(githubRepo, manifest.name, manifest.description)

    // Body dedup: skip remote commands whose body already exists locally
    const localBodies = db.getLocalCommandBodies()

    const toAdd = commands
        .filter(({ command }) => !localBodies.has(command.body.trim()))
        .map(({ path, command }) => ({
            remotePath: path,
            command: {
                title: command.title,
                body: command.body,
                description: command.description || '',
                tags: JSON.stringify(command.tags || []),
                language: command.language || 'plaintext',
                created_at: command.created_at || new Date().toISOString(),
                updated_at: command.updated_at || new Date().toISOString(),
            }
        }))

    const syncResult = db.syncRemoteCommands(libraryId, sha, toAdd, [], [])

    // Fetch the created library
    const library = db.getLibraryByRepo(githubRepo)!
    return { library, syncResult }
}

export async function syncLibrary(libraryId: number, force = false): Promise<SyncResult> {
    const libraries = db.getAllLibraries()
    const library = libraries.find(l => l.id === libraryId)
    if (!library) throw new Error(`Library not found: ${libraryId}`)

    const { owner, repo } = parseRepoUrl(library.github_repo)
    const branch = await getRepoDefaultBranch(owner, repo)
    const sha = await getLatestCommitSha(owner, repo, branch)

    // Skip if nothing changed (unless force-syncing, e.g. user clicked Sync)
    if (!force && library.last_synced_sha === sha) {
        return { added: 0, updated: 0, removed: 0, errors: [] }
    }

    // Fetch remote commands
    const { commands: remoteCommands } = await browseLibrary(library.github_repo)

    // Get current local remote commands for this library
    const localRemote = db.getRemoteCommands(libraryId)
    const localByPath = new Map(localRemote.map(c => [c.remote_path, c]))
    const remotePaths = new Set(remoteCommands.map(c => c.path))

    // Diff: add, update, remove
    const toAdd: Array<{ remotePath: string; command: { title: string; body: string; description: string; tags: string; language: string; created_at: string; updated_at: string } }> = []
    const toUpdate: Array<{ remotePath: string; command: { title: string; body: string; description: string; tags: string; language: string; updated_at: string } }> = []
    const toRemove: string[] = []

    // Body dedup: skip remote commands whose body already exists locally
    const localBodies = db.getLocalCommandBodies()

    for (const { path, command } of remoteCommands) {
        const local = localByPath.get(path)
        if (!local) {
            // Skip if a local command already has the same body
            if (localBodies.has(command.body.trim())) continue

            // New command
            toAdd.push({
                remotePath: path,
                command: {
                    title: command.title,
                    body: command.body,
                    description: command.description || '',
                    tags: JSON.stringify(command.tags || []),
                    language: command.language || 'plaintext',
                    created_at: command.created_at || new Date().toISOString(),
                    updated_at: command.updated_at || new Date().toISOString(),
                }
            })
        } else {
            // Check if updated (compare updated_at timestamps)
            const remoteUpdated = command.updated_at || ''
            const localUpdated = local.updated_at || ''
            if (remoteUpdated > localUpdated) {
                toUpdate.push({
                    remotePath: path,
                    command: {
                        title: command.title,
                        body: command.body,
                        description: command.description || '',
                        tags: JSON.stringify(command.tags || []),
                        language: command.language || 'plaintext',
                        updated_at: command.updated_at || new Date().toISOString(),
                    }
                })
            }
        }
    }

    // Commands that exist locally but not remotely → removed
    for (const local of localRemote) {
        if (local.remote_path && !remotePaths.has(local.remote_path)) {
            toRemove.push(local.remote_path)
        }
    }

    return db.syncRemoteCommands(libraryId, sha, toAdd, toUpdate, toRemove)
}

export async function syncAllLibraries(): Promise<{ results: Array<{ library: Library; result: SyncResult }> }> {
    const libraries = db.getAllLibraries()
    const results: Array<{ library: Library; result: SyncResult }> = []

    for (const library of libraries) {
        try {
            const result = await syncLibrary(library.id)
            // Re-fetch library to get updated sync timestamp
            const updated = db.getLibraryByRepo(library.github_repo)
            results.push({ library: updated || library, result })
        } catch (e) {
            results.push({
                library,
                result: { added: 0, updated: 0, removed: 0, errors: [(e as Error).message] }
            })
        }
    }

    return { results }
}

export function unsubscribeFromLibrary(libraryId: number): void {
    db.deleteLibrary(libraryId)
}

export function getAllLibraries(): Library[] {
    return db.getAllLibraries()
}
