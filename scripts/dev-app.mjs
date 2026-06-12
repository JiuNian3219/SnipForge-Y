#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const cacheRoot = path.join(projectRoot, '.cache')
const homeDir = path.join(cacheRoot, 'home')
const npmCacheDir = path.join(cacheRoot, 'npm')
const electronGypDir = path.join(cacheRoot, 'electron-gyp')

mkdirSync(homeDir, { recursive: true })
mkdirSync(npmCacheDir, { recursive: true })
mkdirSync(electronGypDir, { recursive: true })

function run(command, args, extraEnv = {}) {
  const executable = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : command
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', command, ...args]
    : args
  const result = spawnSync(executable, commandArgs, {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ...extraEnv,
    },
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const args = process.argv.slice(2)
const shouldRebuildDeps = args.includes('--rebuild') || process.env.SNIPFORGE_REBUILD_DEPS === '1'
const debugPort = args.find(arg => arg !== '--rebuild')

// Rebuild native addons only when explicitly requested. On Windows with pnpm 11,
// electron-builder can try to execute pnpm.mjs directly and fail before dev starts.
if (shouldRebuildDeps) {
  run('pnpm', ['exec', 'electron-builder', 'install-app-deps'], {
    HOME: homeDir,
    npm_config_cache: npmCacheDir,
    npm_config_devdir: electronGypDir,
  })
}

run('pnpm', ['exec', 'vite'], debugPort ? { REMOTE_DEBUG: debugPort } : {})
