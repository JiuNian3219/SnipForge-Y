import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const GENERATED_STATE_FILE = '.snipforge-index.json'
const LIBRARY_MANIFEST_FILE = '.snipforge.json'
const DEFAULT_EXCLUDED_DIRS = new Set([
  '.git',
  '.next',
  '.turbo',
  '.vite',
  'coverage',
  'dist',
  'build',
  'node_modules',
])

export async function indexTypeScriptRepo(repoPath, options = {}) {
  const sourceRoot = path.resolve(repoPath)
  const repoName = path.basename(sourceRoot)
  const outputRoot = path.resolve(options.outDir ?? path.join(sourceRoot, '.snipforge-ts-index'))
  const generatedAt = options.generatedAt ?? new Date().toISOString()
  const manifestName = options.libraryName?.trim() || `${repoName} TypeScript Index`
  const manifestDescription = options.libraryDescription?.trim() || `Generated from exported TypeScript declarations in ${repoName}.`

  const sourceFiles = await findTypeScriptFiles(sourceRoot)
  const entries = []

  for (const filePath of sourceFiles) {
    const extracted = await extractExportsFromFile(sourceRoot, filePath)
    entries.push(...extracted)
  }

  await fs.mkdir(outputRoot, { recursive: true })
  await writeManifest(outputRoot, manifestName, manifestDescription)

  const generatedFiles = []
  for (const entry of entries) {
    const filename = buildEntryFilename(entry)
    const outputPath = path.join(outputRoot, filename)
    generatedFiles.push(filename)

    const payload = {
      snipforge: 'command',
      id: buildStableUuid(`${entry.relativePath}:${entry.exportName}:${entry.kind}`),
      title: entry.title,
      body: entry.body,
      description: entry.description,
      tags: entry.tags,
      language: 'typescript',
      created_at: generatedAt,
      updated_at: generatedAt,
      source_location: {
        file: entry.relativePath,
        line: entry.line,
        column: entry.column,
        export: entry.exportName,
        kind: entry.kind,
      },
    }

    await fs.writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  }

  const removedFiles = await cleanupStaleGeneratedFiles(outputRoot, generatedFiles)
  await writeGeneratedState(outputRoot, {
    generator: 'typescript-indexer-v1',
    source_root: sourceRoot,
    generated_at: generatedAt,
    files: generatedFiles,
  })

  return {
    libraryPath: outputRoot,
    manifestName,
    generatedCount: generatedFiles.length,
    removedCount: removedFiles.length,
    files: generatedFiles,
    removedFiles,
  }
}

export async function findTypeScriptFiles(rootDir) {
  const results = []
  const root = path.resolve(rootDir)

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        if (DEFAULT_EXCLUDED_DIRS.has(entry.name)) {
          continue
        }

        await walk(fullPath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith('.d.ts')) {
        continue
      }

      results.push(fullPath)
    }
  }

  await walk(root)
  results.sort((a, b) => a.localeCompare(b))
  return results
}

export async function extractExportsFromFile(rootDir, filePath) {
  const sourceText = await fs.readFile(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
  const relativePath = toPosixPath(path.relative(rootDir, filePath))
  const declarationMap = buildDeclarationMap(sourceFile)
  const entries = []
  const seen = new Set()

  for (const statement of sourceFile.statements) {
    for (const candidate of extractDirectExportsFromStatement(sourceFile, statement, relativePath)) {
      const key = `${candidate.exportName}:${candidate.line}:${candidate.column}`
      if (seen.has(key)) continue
      seen.add(key)
      entries.push(candidate)
    }

    if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
      continue
    }

    for (const element of statement.exportClause.elements) {
      const localName = element.propertyName?.text ?? element.name.text
      const exportName = element.name.text
      const declaration = declarationMap.get(localName)
      if (!declaration) {
        continue
      }

      const candidate = declarationToEntry(sourceFile, declaration, relativePath, exportName)
      if (!candidate) {
        continue
      }

      const key = `${candidate.exportName}:${candidate.line}:${candidate.column}`
      if (seen.has(key)) continue
      seen.add(key)
      entries.push(candidate)
    }
  }

  entries.sort((a, b) => {
    if (a.relativePath !== b.relativePath) {
      return a.relativePath.localeCompare(b.relativePath)
    }
    return a.exportName.localeCompare(b.exportName)
  })

  return entries
}

function buildDeclarationMap(sourceFile) {
  const declarations = new Map()

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      declarations.set(statement.name.text, statement)
      continue
    }

    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      declarations.set(statement.name.text, statement)
      continue
    }

    if (!ts.isVariableStatement(statement)) {
      continue
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue
      }

      if (!isFunctionLikeVariable(declaration)) {
        continue
      }

      declarations.set(declaration.name.text, declaration)
    }
  }

  return declarations
}

function extractDirectExportsFromStatement(sourceFile, statement, relativePath) {
  if (ts.isFunctionDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
    const entry = declarationToEntry(sourceFile, statement, relativePath)
    return entry ? [entry] : []
  }

  if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) {
    return []
  }

  const entries = []
  for (const declaration of statement.declarationList.declarations) {
    const entry = declarationToEntry(sourceFile, declaration, relativePath)
    if (entry) {
      entries.push(entry)
    }
  }
  return entries
}

function declarationToEntry(sourceFile, declaration, relativePath, exportNameOverride) {
  if (ts.isFunctionDeclaration(declaration)) {
    if (!declaration.name || (!hasExportModifier(declaration) && !exportNameOverride)) {
      return null
    }

    return buildEntry(sourceFile, declaration, relativePath, {
      exportName: exportNameOverride ?? declaration.name.text,
      kind: 'function',
      title: `${exportNameOverride ?? declaration.name.text}()`,
    })
  }

  if (ts.isInterfaceDeclaration(declaration)) {
    if (!hasExportModifier(declaration) && !exportNameOverride) {
      return null
    }

    return buildEntry(sourceFile, declaration, relativePath, {
      exportName: exportNameOverride ?? declaration.name.text,
      kind: 'interface',
      title: `interface ${exportNameOverride ?? declaration.name.text}`,
    })
  }

  if (ts.isTypeAliasDeclaration(declaration)) {
    if (!hasExportModifier(declaration) && !exportNameOverride) {
      return null
    }

    return buildEntry(sourceFile, declaration, relativePath, {
      exportName: exportNameOverride ?? declaration.name.text,
      kind: 'type',
      title: `type ${exportNameOverride ?? declaration.name.text}`,
    })
  }

  if (ts.isVariableDeclaration(declaration)) {
    if (!ts.isIdentifier(declaration.name)) {
      return null
    }

    const variableStatement = declaration.parent?.parent
    if (!exportNameOverride && (!variableStatement || !ts.isVariableStatement(variableStatement) || !hasExportModifier(variableStatement))) {
      return null
    }

    if (!isFunctionLikeVariable(declaration)) {
      return null
    }

    return buildEntry(sourceFile, declaration, relativePath, {
      exportName: exportNameOverride ?? declaration.name.text,
      kind: 'function',
      title: `${exportNameOverride ?? declaration.name.text}()`,
    })
  }

  return null
}

function buildEntry(sourceFile, node, relativePath, meta) {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  const body = getNodeBodyText(node, sourceFile)

  return {
    exportName: meta.exportName,
    kind: meta.kind,
    title: meta.title,
    body,
    description: `${capitalize(meta.kind)} export from ${relativePath}:${start.line + 1}`,
    tags: ['typescript', meta.kind, relativePathToTag(relativePath)],
    relativePath,
    line: start.line + 1,
    column: start.character + 1,
  }
}

function getNodeBodyText(node, sourceFile) {
  if (ts.isVariableDeclaration(node) && node.initializer) {
    const name = ts.isIdentifier(node.name) ? node.name.text : 'anonymous'
    const text = node.initializer.getText(sourceFile)
    return `const ${name} = ${text}`
  }

  return node.getText(sourceFile)
}

function hasExportModifier(node) {
  return Boolean(node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
}

function isFunctionLikeVariable(declaration) {
  return Boolean(
    declaration.initializer
    && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
  )
}

function buildEntryFilename(entry) {
  const stem = slugify(`${entry.relativePath.replace(/\//g, '-')}-${entry.exportName}-${entry.kind}`)
  return `${stem}.json`
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9\s._/-]/g, '')
    .replace(/[/.]+/g, '-')
    .replace(/[\s_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || 'untitled'
}

function buildStableUuid(input) {
  const digest = createHash('sha1').update(input).digest('hex')
  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `${((parseInt(digest.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${digest.slice(18, 20)}`,
    digest.slice(20, 32),
  ].join('-')
}

function relativePathToTag(relativePath) {
  return relativePath
    .replace(/\.(ts|tsx)$/i, '')
    .replace(/[^a-z0-9/]+/gi, '-')
    .replace(/\//g, ':')
    .replace(/-+/g, '-')
    .replace(/^:|:$/g, '')
    .toLowerCase()
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

async function writeManifest(outputRoot, name, description) {
  const manifest = {
    snipforge: 'library',
    name,
    description,
    format_version: '1.0',
  }

  await fs.writeFile(
    path.join(outputRoot, LIBRARY_MANIFEST_FILE),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  )
}

async function cleanupStaleGeneratedFiles(outputRoot, currentFiles) {
  const staleFiles = []
  const previousState = await readGeneratedState(outputRoot)
  if (!previousState?.files || !Array.isArray(previousState.files)) {
    return staleFiles
  }

  const currentSet = new Set(currentFiles)
  for (const file of previousState.files) {
    if (typeof file !== 'string' || currentSet.has(file)) {
      continue
    }

    try {
      await fs.unlink(path.join(outputRoot, file))
      staleFiles.push(file)
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error
      }
    }
  }

  return staleFiles
}

async function readGeneratedState(outputRoot) {
  try {
    const raw = await fs.readFile(path.join(outputRoot, GENERATED_STATE_FILE), 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function writeGeneratedState(outputRoot, state) {
  await fs.writeFile(
    path.join(outputRoot, GENERATED_STATE_FILE),
    JSON.stringify(state, null, 2) + '\n',
    'utf8',
  )
}
