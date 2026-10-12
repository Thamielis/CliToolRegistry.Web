import rawRegistry from './explorerRegistry.json'
import { validateExplorerRegistry } from './explorerRegistryValidation.mjs'
import type { ExplorerRegistry } from '../types/explorer'

const diagnostics = validateExplorerRegistry(rawRegistry)
if (diagnostics.length > 0) {
  throw new Error('Die Explorer-Registry ist ungültig: ' + diagnostics.map(({ code, source }) => `${code} (${source})`).join(', '))
}

export const explorerRegistry = rawRegistry as ExplorerRegistry
