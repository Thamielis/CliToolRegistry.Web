import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getInstallAction,
  getInstallEntries,
  getPlatformCommand,
  getPlatformInstallAction,
  resolveInstallAction,
} from '../src/data/loadApps.ts'
import { categoryLabel } from '../src/i18n/catalogLabels.ts'
import type { CliTool } from '../src/types/app.ts'

const tool = (install: CliTool['install'], platforms: CliTool['platforms'] = ['linux']): CliTool => ({
  id: 'sample', name: 'Sample', description: 'Fixture', category: 'tools', tier: 'optional',
  platforms, install, catalogFile: 'sample.yml', catalogUrl: 'https://example.test/sample.yml',
})

test('structured shell recipes remain structured and never become a copyable executable', () => {
  const recipe = {
    linux: {
      standalone: {
        commandName: '/bin/bash',
        arguments: ['-c', 'printf hello'],
      },
    },
  }
  const action = getPlatformInstallAction(recipe, 'linux')

  assert.deepEqual(action, {
    kind: 'recipe', commandName: '/bin/bash', arguments: ['-c', 'printf hello'], method: 'standalone',
  })
  assert.equal(getPlatformCommand(recipe, 'linux'), null)
  assert.deepEqual(getInstallAction(tool(recipe, ['linux']), 'all')?.action, action)
})

test('ACFS placeholder echoes and explicit notes are informational, not commands', () => {
  const action = getPlatformInstallAction({ linux: { standalone: 'echo "Install rch through ACFS"' } }, 'linux')
  assert.deepEqual(action, { kind: 'note', note: 'Install rch through ACFS', method: 'standalone' })
  assert.equal(getPlatformCommand({ linux: { standalone: 'echo "Install rch through ACFS"' } }, 'linux'), null)
  assert.deepEqual(resolveInstallAction({ note: 'Install with ACFS' }), { kind: 'note', note: 'Install with ACFS' })
})

test('direct commands remain copyable and unsupported platforms do not borrow another platform command', () => {
  const install = { linux: { apt: 'sudo apt install sample' }, windows: { winget: 'winget install sample' } }
  assert.deepEqual(getPlatformInstallAction(install, 'linux'), {
    kind: 'command', command: 'sudo apt install sample', method: 'apt',
  })
  assert.equal(getPlatformCommand(install, 'linux'), 'sudo apt install sample')
  assert.equal(getPlatformCommand({ linux: 'sudo apt install sample' }, 'windows'), null)
})

test('install entries expose notes and recipes with their declared platforms', () => {
  const sample = tool({
    linux: { standalone: { commandName: 'bash', arguments: ['install.sh'], note: 'Pinned install' } },
    windows: { standalone: 'echo "Install sample through ACFS"' },
  }, ['linux', 'windows'])
  assert.deepEqual(getInstallEntries(sample), [
    { platform: 'linux', action: { kind: 'recipe', commandName: 'bash', arguments: ['install.sh'], method: 'standalone', note: 'Pinned install' } },
    { platform: 'windows', action: { kind: 'note', note: 'Install sample through ACFS', method: 'standalone' } },
  ])
})

test('catalog category IDs keep stable values while receiving localized display labels', () => {
  const expected = {
    acfs: ['ACFS', 'ACFS'], agents: ['Agenten', 'Agents'], base: ['Grundlagen', 'Foundations'],
    cli: ['Kommandozeile', 'Command line'], cloud: ['Cloud-Dienste', 'Cloud services'],
    db: ['Datenbanken', 'Databases'], filesystem: ['Dateisysteme', 'Filesystems'],
    lang: ['Programmiersprachen', 'Programming languages'], network: ['Netzwerkwerkzeuge', 'Network tools'],
    shell: ['Shell-Werkzeuge', 'Shell tools'], stack: ['Technologie-Stacks', 'Technology stacks'],
    tools: ['Entwicklungswerkzeuge', 'Development tools'],
  } as const

  for (const [id, labels] of Object.entries(expected)) {
    assert.deepEqual([categoryLabel(id, 'de'), categoryLabel(id, 'en')], labels)
  }
})
