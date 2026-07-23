import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { transient } from '../lib/undo'

/**
 * The optimistic write law (DECISIONS.md, July 21 2026):
 * patch what the user sees synchronously, persist in the background,
 * and on failure put the truth back and say so — never fail silently.
 *
 * Resolves true when the write landed, false when it was rolled back.
 */
export async function optimisticWrite(
  qc: QueryClient,
  write: {
    keys: QueryKey[]
    patch: () => void
    persist: () => Promise<void>
    onFail: string
  },
): Promise<boolean> {
  const snapshots = write.keys.map((k) => [k, qc.getQueryData(k)] as const)
  write.patch()
  void Promise.all(write.keys.map((k) => qc.cancelQueries({ queryKey: k })))
  try {
    await write.persist()
    await Promise.all(write.keys.map((k) => qc.invalidateQueries({ queryKey: k })))
    return true
  } catch (err) {
    for (const [key, snap] of snapshots) qc.setQueryData(key, snap)
    transient.notice(write.onFail)
    console.error('[optimisticWrite]', err)
    return false
  }
}

/**
 * The row-check law: every update-by-id must prove a row changed.
 * Zero rows = the write silently missed — throw loud instead.
 */
export function assertRowChanged(
  data: unknown[] | null,
  error: { message: string } | null,
  what: string,
): void {
  if (error) throw new Error(`${what}: ${error.message}`)
  if (!data || data.length === 0)
    throw new Error(`Zero rows changed — ${what}. The write did not land.`)
}

/** The length-cap law: applied at write time, mirrored in the schema. */
export function capText(text: string, max: number): string {
  const trimmed = text.trim()
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max)
}
