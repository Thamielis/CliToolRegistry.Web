import { spawnSync } from 'node:child_process'
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const registryDataDirectory = 'src/CliToolRegistry/Data'
const catalogDirectory = `${registryDataDirectory}/Tools`
const profilesDirectory = `${registryDataDirectory}/Profiles`
const repositoryUrl = 'https://github.com/In-Pro-Org/CliToolRegistry'
const sourceRoot = resolve(process.env.CLI_TOOL_REGISTRY_PATH || resolve(projectRoot, '../CliToolRegistry'))
const sourceDirectory = resolve(sourceRoot, catalogDirectory)
const profileDirectory = resolve(sourceRoot, profilesDirectory)
const outputPath = resolve(projectRoot, 'public/registry-catalog.json')
const profilesOutputPath = resolve(projectRoot, 'public/registry-profiles.json')
const profilesModulePath = resolve(projectRoot, 'src/data/registryProfiles.json')
const schemaOutputDirectory = resolve(projectRoot, 'src/data/schemas')
const schemaFiles = [
  'tool-definition.schema.json',
  'tool-catalog.schema.json',
  'tool-profile.schema.json',
  'Completion/command-binding.schema.json',
  'Tools/ai-tool.schema.json',
]

try {
  await Promise.all([access(sourceDirectory), access(profileDirectory)])
} catch {
  try {
    await Promise.all([
      access(outputPath), access(profilesOutputPath), access(profilesModulePath),
      ...schemaFiles.map((file) => access(resolve(schemaOutputDirectory, file.replace(/^Tools\//, '').replace(/^Completion\//, 'completion-')))),
    ])
    console.info('CliToolRegistry wurde nicht bereitgestellt; die versionierten Katalog- und Schema-Snapshots bleiben aktiv.')
    process.exit(0)
  } catch {
    console.error('CliToolRegistry oder versionierte Snapshots fehlen. Setze CLI_TOOL_REGISTRY_PATH auf den Repository-Pfad.')
    process.exit(1)
  }
}

function gitValue(args) {
  const result = spawnSync('git', ['-C', sourceRoot, ...args], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`CliToolRegistry-Quellstand konnte nicht bestimmt werden: git ${args.join(' ')}`)
  return result.stdout.trim()
}

const sourceBranch = gitValue(['branch', '--show-current']) || null
const sourceRevision = gitValue(['rev-parse', 'HEAD'])
const sourceCommitDate = gitValue(['show', '-s', '--format=%cI', 'HEAD'])
const sourceRef = process.env.CLI_TOOL_REGISTRY_REF || sourceBranch || 'detached'

for (const file of schemaFiles) {
  const sourcePath = resolve(sourceRoot, registryDataDirectory, file)
  const contents = await readFile(sourcePath, 'utf8')
  const parsed = JSON.parse(contents)
  if (parsed.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    throw new Error(`${file} muss JSON Schema 2020-12 deklarieren.`)
  }
  const targetPath = resolve(schemaOutputDirectory, file.replace(/^Tools\//, '').replace(/^Completion\//, 'completion-'))
  await mkdir(dirname(targetPath), { recursive: true })
  await writeFile(targetPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8')
}

const files = (await readdir(sourceDirectory))
  .filter((file) => file.endsWith('.yml'))
  .sort((left, right) => left.localeCompare(right, 'en'))
if (files.length === 0) throw new Error('Im Registry-Repository wurden keine YAML-Toolkataloge gefunden.')

const tools = []
const ids = new Set()
for (const file of files) {
  const catalog = parse(await readFile(resolve(sourceDirectory, file), 'utf8'))
  if (!catalog || !Array.isArray(catalog.tools)) throw new Error(`Die Katalogdatei ${file} enthält keine Werkzeugliste.`)

  for (const tool of catalog.tools) {
    if (!tool || typeof tool.id !== 'string' || typeof tool.name !== 'string') {
      throw new Error(`Die Katalogdatei ${file} enthält einen Werkzeugeintrag ohne ID oder Namen.`)
    }
    if (ids.has(tool.id)) throw new Error(`Die Registry enthält die ID ${tool.id} mehrfach.`)
    ids.add(tool.id)
    tools.push({
      ...tool,
      catalogFile: file,
      catalogUrl: `${repositoryUrl}/blob/${sourceRevision}/${catalogDirectory}/${file}`,
    })
  }
}
tools.sort((left, right) => left.name.localeCompare(right.name, 'en') || left.id.localeCompare(right.id, 'en'))

const profiles = {}
const profileFiles = (await readdir(profileDirectory))
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .sort((left, right) => left.localeCompare(right, 'en'))
for (const file of profileFiles) {
  const source = parse(await readFile(resolve(profileDirectory, file), 'utf8'))
  if (!source || typeof source.profiles !== 'object' || source.profiles === null || Array.isArray(source.profiles)) {
    throw new Error(`Die Profildatei ${file} enthält kein Profile-Objekt.`)
  }
  for (const [name, profile] of Object.entries(source.profiles)) {
    if (Object.hasOwn(profiles, name)) throw new Error(`Das Profil ${name} ist in mehreren Dateien definiert.`)
    profiles[name] = profile
  }
}

const catalogSnapshot = {
  loadedAt: sourceCommitDate,
  sourceCommitDate,
  sourceRepository: repositoryUrl,
  sourceRef,
  sourceRevision,
  fileCount: files.length,
  tools,
}
const profileSnapshot = { schemaVersion: '1.1', profiles }
await writeFile(outputPath, JSON.stringify(catalogSnapshot, null, 2) + '\n', 'utf8')
await writeFile(profilesOutputPath, JSON.stringify(profileSnapshot, null, 2) + '\n', 'utf8')
await writeFile(profilesModulePath, JSON.stringify(profileSnapshot, null, 2) + '\n', 'utf8')
console.info(`Registry-Katalog synchronisiert: ${tools.length} Tools, ${Object.keys(profiles).length} Profile, Quelle ${sourceRevision}.`)
