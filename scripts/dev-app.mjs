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
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
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

const debugPort = process.argv[2]

// Keep the native addon ABI aligned with Electron before starting Vite dev.
run('pnpm', ['exec', 'electron-builder', 'install-app-deps'], {
  HOME: homeDir,
  npm_config_cache: npmCacheDir,
  npm_config_devdir: electronGypDir,
})
run('pnpm', ['exec', 'vite'], debugPort ? { REMOTE_DEBUG: debugPort } : {})
