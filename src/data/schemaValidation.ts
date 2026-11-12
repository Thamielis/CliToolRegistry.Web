import Ajv2020 from 'ajv/dist/2020'
import type { AnySchema, ErrorObject, ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import toolCatalogSchema from './schemas/tool-catalog.schema.json'
import toolDefinitionSchema from './schemas/tool-definition.schema.json'
import toolProfileSchema from './schemas/tool-profile.schema.json'
import type { CliTool, CliToolProfileCatalog, CliToolProfileDefinition, ToolPlatform } from '../types/app'

export type SchemaValidationState = 'valid' | 'invalid' | 'unsupported'

export interface SchemaValidationResult {
  state: SchemaValidationState
  errors: { path: string; message: string; keyword: string }[]
}

const validator = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, validateFormats: true })
addFormats(validator)
validator.addSchema(toolDefinitionSchema)

type EnumSchema = { enum?: unknown[] }
const toolProperties = (toolDefinitionSchema as { properties?: Record<string, unknown> }).properties ?? {}
const platformValues = (toolProperties.platforms as { items?: EnumSchema } | undefined)?.items?.enum
const categoryValues = (toolProperties.category as EnumSchema | undefined)?.enum
export const TOOL_PLATFORMS: readonly ToolPlatform[] = Array.isArray(platformValues)
  ? platformValues.filter((value): value is ToolPlatform => ['windows', 'linux', 'wsl2', 'macos'].includes(String(value)))
  : ['windows', 'linux', 'wsl2', 'macos']
export const TOOL_CATEGORIES: readonly string[] = Array.isArray(categoryValues)
  ? categoryValues.filter((value): value is string => typeof value === 'string')
  : []

function compile(schema: AnySchema): ValidateFunction | null {
  try {
    return validator.compile(schema)
  } catch {
    return null
  }
}

const toolValidator = validator.getSchema(toolDefinitionSchema.$id) ?? null
const catalogValidator = compile(toolCatalogSchema)
const profileValidator = compile(toolProfileSchema)
const hasUnsupportedSchema = !toolValidator || !catalogValidator || !profileValidator

function result(validate: ValidateFunction | null, value: unknown): SchemaValidationResult {
  if (!validate) return { state: 'unsupported', errors: [] }
  try {
    const valid = validate(value)
    return {
      state: valid ? 'valid' : 'invalid',
      errors: (validate.errors ?? []).map((error: ErrorObject) => ({
        path: error.instancePath || '/',
        message: error.message ?? 'Schema validation failed.',
        keyword: error.keyword,
      })),
    }
  } catch (error) {
    return {
      state: 'unsupported',
      errors: [{ path: '/', message: error instanceof Error ? error.message : String(error), keyword: 'validator' }],
    }
  }
}

export function validateToolDefinition(value: unknown): SchemaValidationResult {
  return result(toolValidator, value)
}

export function validateToolCatalog(value: unknown): SchemaValidationResult {
  return result(catalogValidator, value)
}

export function validateProfileCatalog(value: unknown): SchemaValidationResult {
  return result(profileValidator, value)
}

export function registrySchemasSupported(): boolean {
  return !hasUnsupportedSchema
}

export function validateToolReferences(
  tool: CliTool,
  tools: readonly Pick<CliTool, 'id'>[],
): { path: string; message: string }[] {
  const ids = new Set(tools.map(({ id }) => id))
  const errors: { path: string; message: string }[] = []
  const check = (path: string, value: unknown) => {
    if (typeof value === 'string' && !ids.has(value)) errors.push({ path, message: `Unknown tool ID: ${value}` })
  }
  check('/hostToolId', tool.hostToolId)
  for (const kind of ['required', 'recommended'] as const) {
    for (const [index, dependency] of (tool.dependencies?.[kind] ?? []).entries()) {
      check(`/dependencies/${kind}/${index}`, dependency)
    }
  }
  return errors
}

export function validateProfileReferences(
  profile: CliToolProfileDefinition,
  profileCatalog: CliToolProfileCatalog,
  tools: readonly Pick<CliTool, 'id'>[],
): { path: string; message: string }[] {
  const toolIds = new Set(tools.map(({ id }) => id))
  const errors: { path: string; message: string }[] = []
  for (const [index, parent] of (profile.inherits ?? []).entries()) {
    if (!Object.hasOwn(profileCatalog.profiles, parent)) errors.push({ path: `/inherits/${index}`, message: `Unknown profile: ${parent}` })
  }
  for (const kind of ['required', 'recommended'] as const) {
    for (const [index, id] of (profile.tools?.[kind] ?? []).entries()) {
      if (!toolIds.has(id)) errors.push({ path: `/tools/${kind}/${index}`, message: `Unknown tool ID: ${id}` })
    }
  }
  return errors
}
