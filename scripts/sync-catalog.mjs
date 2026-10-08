import { spawnSync } from 'node:child_process'
import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const catalogDirectory = 'src/CliToolRegistry/Data/Tools'
const repositoryUrl = 'https://github.com/In-Pro-Org/CliToolRegistry'
const sourceRoot = resolve(
  process.env.CLI_TOOL_REGISTRY_PATH || resolve(projectRoot, '../CliToolRegistry'),
)
const sourceDirectory = resolve(sourceRoot, catalogDirectory)
const outputPath = resolve(projectRoot, 'public/registry-catalog.json')

try {
  await access(sourceDirectory)
} catch {
  try {
    await access(outputPath)
    console.info('CliToolRegistry wurde nicht gefunden; der vorhandene Katalog bleibt erhalten.')
    process.exit(0)
  } catch {
    console.error('CliToolRegistry wurde nicht gefunden. Setze CLI_TOOL_REGISTRY_PATH auf den Repository-Pfad.')
    process.exit(1)
  }
}

const branch = spawnSync('git', ['-C', sourceRoot, 'branch', '--show-current'], {
  encoding: 'utf8',
})
const sourceRef = process.env.CLI_TOOL_REGISTRY_REF || branch.stdout?.trim() || 'main'
const files = (await readdir(sourceDirectory))
  .filter((file) => file.endsWith('.yml'))
  .sort((left, right) => left.localeCompare(right))

if (files.length === 0) throw new Error('Im Registry-Repository wurden keine YAML-Kataloge gefunden.')

const tools = []
const ids = new Set()
for (const file of files) {
  const catalog = parse(await readFile(resolve(sourceDirectory, file), 'utf8'))
  if (!catalog || !Array.isArray(catalog.tools)) {
    throw new Error('Die Katalogdatei ' + file + ' enthält keine Werkzeugliste.')
  }

  for (const tool of catalog.tools) {
    if (!tool || typeof tool.id !== 'string' || typeof tool.name !== 'string') {
      throw new Error('Die Katalogdatei ' + file + ' enthält einen Werkzeugeintrag ohne ID oder Namen.')
    }
    if (ids.has(tool.id)) throw new Error('Die Registry enthält die ID ' + tool.id + ' mehrfach.')
    ids.add(tool.id)
    tools.push({
      ...tool,
      catalogFile: file,
      catalogUrl:
        repositoryUrl +
        '/blob/' +
        sourceRef +
        '/' +
        catalogDirectory +
        '/' +
        file,
    })
  }
}

tools.sort((left, right) => left.name.localeCompare(right.name))

const snapshot = {
  loadedAt: new Date().toISOString(),
  sourceRepository: repositoryUrl,
  sourceRef,
  fileCount: files.length,
  tools,
}

await writeFile(outputPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8')
console.info('Registry-Katalog aktualisiert: ' + tools.length + ' Werkzeuge aus ' + files.length + ' YAML-Dateien.')
