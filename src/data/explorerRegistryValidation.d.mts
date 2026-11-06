import type { AdapterId, ExplorerRegistryDiagnostic } from '../types/explorer.ts'

export const ADAPTER_IDS: readonly AdapterId[]

export function validateExplorerRegistry(value: unknown): ExplorerRegistryDiagnostic[]

export function isSafeExplorerFilename(value: unknown): value is string
