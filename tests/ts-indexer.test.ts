import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { indexTypeScriptRepo } from '../bin/ts-indexer.mjs'
import { runCli } from '../bin/snipforge-lib.mjs'

let tmpDir: string
let repoDir: string
let outDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'snipforge-ts-indexer-'))
  repoDir = path.join(tmpDir, 'repo')
  outDir = path.join(tmpDir, 'library')

  await fs.mkdir(path.join(repoDir, 'src'), { recursive: true })
  await fs.mkdir(path.join(repoDir, 'node_modules', 'ignored'), { recursive: true })

  await fs.writeFile(path.join(repoDir, 'src', 'api.ts'), [
    'export function listUsers(limit: number): Promise<string[]> {',
    '  return Promise.resolve([])',
    '}',
    '',
    'export interface UserRecord {',
    '  id: string',
    '}',
    '',
    'export type UserId = UserRecord[\'id\']',
    '',
    'export const formatUser = (user: UserRecord) => user.id',
    '',
    'const hidden = () => true',
  ].join('\n'))

  await fs.writeFile(path.join(repoDir, 'src', 'barrel.ts'), [
    'function helper(name: string) {',
    '  return name.trim()',
    '}',
    '',
    'type LocalAlias = string | number',
    '',
    'export { helper, LocalAlias as PublicAlias }',
  ].join('\n'))

  await fs.writeFile(path.join(repoDir, 'node_modules', 'ignored', 'skip.ts'), 'export function nope() { return 1 }')
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('TypeScript indexer', () => {
  it('indexes exported declarations into a SnipForge library', async () => {
    const result = await indexTypeScriptRepo(repoDir, {
      outDir,
      generatedAt: '2026-04-12T10:00:00.000Z',
    })

    expect(result.generatedCount).toBe(6)

    const files = (await fs.readdir(outDir)).sort()
    expect(files).toContain('.snipforge.json')
    expect(files).toContain('.snipforge-index.json')

    const commandFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('.snipforge'))
    expect(commandFiles).toHaveLength(6)

    const sample = JSON.parse(await fs.readFile(path.join(outDir, commandFiles[0]), 'utf8'))
    expect(sample.language).toBe('typescript')
    expect(sample.source_location.file).toMatch(/^src\//)
    expect(sample.source_location.line).toBeGreaterThan(0)
    expect(sample.description).toContain(sample.source_location.file)
  })

  it('removes stale generated files on rerun without duplicating entries', async () => {
    await indexTypeScriptRepo(repoDir, {
      outDir,
      generatedAt: '2026-04-12T10:00:00.000Z',
    })

    await fs.writeFile(path.join(repoDir, 'src', 'api.ts'), [
      'export function listUsers(limit: number): Promise<string[]> {',
      '  return Promise.resolve([])',
      '}',
      '',
      'export interface UserRecord {',
      '  id: string',
      '}',
    ].join('\n'))

    const result = await indexTypeScriptRepo(repoDir, {
      outDir,
      generatedAt: '2026-04-12T11:00:00.000Z',
    })

    expect(result.generatedCount).toBe(4)
    expect(result.removedCount).toBe(2)

    const commandFiles = (await fs.readdir(outDir))
      .filter(file => file.endsWith('.json') && !file.startsWith('.snipforge'))
    expect(commandFiles).toHaveLength(4)
  })

  it('runs through the CLI command surface', async () => {
    const stdout = { write: vi.fn() }
    const stderr = { write: vi.fn() }

    const exitCode = await runCli(
      ['index-ts', repoDir, '--out', outDir],
      { stdout, stderr, cwd: '/tmp/unused' },
    )

    expect(exitCode).toBe(0)
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('Indexed 6 exports'))
    expect(stderr.write).not.toHaveBeenCalled()
  })

  it('accepts the pnpm script argv shape with a leading double-dash separator', async () => {
    const stdout = { write: vi.fn() }
    const stderr = { write: vi.fn() }

    const exitCode = await runCli(
      ['--', 'index-ts', repoDir, '--out', outDir],
      { stdout, stderr, cwd: '/tmp/unused' },
    )

    expect(exitCode).toBe(0)
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('Indexed 6 exports'))
    expect(stderr.write).not.toHaveBeenCalled()
  })
})
