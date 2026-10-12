export const ADAPTER_IDS = Object.freeze([
  'br-guide',
  'br-capabilities',
  'bv-docs',
  'bv-capabilities',
  'cass-capabilities',
  'ee-capabilities',
  'fmd-capabilities',
  'ubs-docs',
  'generic-json',
])

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/
const FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLocalizedLabel(value) {
  return isRecord(value) && typeof value.de === 'string' && value.de.trim() !== '' &&
    typeof value.en === 'string' && value.en.trim() !== ''
}

function safeFilename(value) {
  return typeof value === 'string' && value.length <= 160 && FILENAME_PATTERN.test(value) &&
    !value.includes('..') && !value.includes('/') && !value.includes('\\')
}

function diagnostic(code, source, message) {
  return { code, source, message }
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

/** Validate the declarative registry shared by the Node generator and browser. */
export function validateExplorerRegistry(value) {
  const diagnostics = []
  if (!isRecord(value) || value.schema !== 'cli-tool-explorer.registry.v1' ||
      !Array.isArray(value.tools) || !Array.isArray(value.datasets)) {
    return [diagnostic('InvalidRegistry', 'registry', 'Expected a v1 registry with tools and datasets arrays.')]
  }

  const toolIds = new Set()
  value.tools.forEach((tool, index) => {
    const source = `registry.tools[${index}]`
    if (!isRecord(tool) || typeof tool.toolId !== 'string' || !ID_PATTERN.test(tool.toolId) ||
        typeof tool.fallbackName !== 'string' || tool.fallbackName.trim() === '') {
      diagnostics.push(diagnostic('InvalidRegistry', source, 'Tool identity and fallback name are invalid.'))
      return
    }
    if (toolIds.has(tool.toolId)) {
      diagnostics.push(diagnostic('InvalidRegistry', source, `Duplicate tool identity: ${tool.toolId}.`))
    }
    toolIds.add(tool.toolId)
  })

  const datasetIds = new Set()
  const filenames = new Set()
  value.datasets.forEach((dataset, index) => {
    const source = `registry.datasets[${index}]`
    if (!isRecord(dataset) || typeof dataset.toolId !== 'string' || !ID_PATTERN.test(dataset.toolId) ||
        typeof dataset.datasetId !== 'string' || !ID_PATTERN.test(dataset.datasetId) ||
        typeof dataset.format !== 'string' || dataset.format !== 'json' ||
        typeof dataset.adapter !== 'string' || !ADAPTER_IDS.includes(dataset.adapter) ||
        !isLocalizedLabel(dataset.title)) {
      diagnostics.push(diagnostic('InvalidRegistry', source, 'Dataset identity, format, adapter, or title is invalid.'))
      return
    }
    if (!safeFilename(dataset.filename)) {
      diagnostics.push(diagnostic('UnsafeFilename', source, 'Filename must be a safe JSON basename of at most 160 characters.'))
    }
    if (!toolIds.has(dataset.toolId)) {
      diagnostics.push(diagnostic('InvalidRegistry', source, `Unknown tool identity: ${dataset.toolId}.`))
    }

    const datasetKey = `${dataset.toolId}\u0000${dataset.datasetId}`
    if (datasetIds.has(datasetKey)) {
      diagnostics.push(diagnostic('DuplicateDataset', source, `Duplicate dataset identity: ${dataset.toolId}/${dataset.datasetId}.`))
    }
    datasetIds.add(datasetKey)
    if (typeof dataset.filename === 'string' && filenames.has(dataset.filename)) {
      diagnostics.push(diagnostic('DuplicateFilename', source, `Filename is registered more than once: ${dataset.filename}.`))
    }
    if (typeof dataset.filename === 'string') filenames.add(dataset.filename)
  })

  return diagnostics.sort((left, right) =>
    compareText(left.code, right.code) || compareText(left.source, right.source) || compareText(left.message, right.message))
}

export function isSafeExplorerFilename(value) {
  return safeFilename(value)
}
