import { describe, expect, it } from 'vitest'
import type { UseQueryResult } from '@tanstack/react-query'
import { derive, proven } from './proof'

/**
 * EMPTINESS MUST BE EARNED — the law, encoded.
 *
 * These assertions are the ruling of July 31 in executable form: the
 * boundary between "loading" and "stalled" is failureCount, not
 * paused-ness. Move the threshold here and the tests say what changed.
 */

// Only the four fields `proven` reads. The rest of UseQueryResult is not
// its business, and pretending otherwise would make these tests fiction.
const q = <T,>(p: {
  status: 'pending' | 'error' | 'success'
  failureCount: number
  data?: T
}) => ({ ...p, refetch: () => {} }) as unknown as UseQueryResult<T, Error>

describe('proven', () => {
  it('a succeeded query is proven — including a genuinely empty one', () => {
    const p = proven(q<string[]>({ status: 'success', failureCount: 0, data: [] }))
    expect(p.proven).toBe(true)
    if (p.proven) expect(p.value).toEqual([])
  })

  it('proven carries the real rows through', () => {
    const p = proven(q({ status: 'success', failureCount: 0, data: ['a', 'b'] }))
    if (!p.proven) throw new Error('should be proven')
    expect(p.value).toEqual(['a', 'b'])
  })

  it('THE HAPPY PATH NEVER FLASHES: pending with no failures is loading, and loading renders nothing', () => {
    const p = proven(q<string[]>({ status: 'pending', failureCount: 0 }))
    expect(p).toEqual({ proven: false, state: 'loading' })
  })

  it('RULING 1: one failure is enough — a paused query still pending is STALLED, not loading', () => {
    // This is the exact production state: 401, failureCount 1, retry
    // paused because document.visibilityState === 'hidden'. Before the
    // ruling this rendered "Clear. Every loop has a verdict."
    const p = proven(q<string[]>({ status: 'pending', failureCount: 1 }))
    expect(p.proven).toBe(false)
    if (!p.proven) expect(p.state).toBe('stalled')
  })

  it('an errored query is stalled', () => {
    const p = proven(q<string[]>({ status: 'error', failureCount: 4 }))
    if (p.proven) throw new Error('should not be proven')
    expect(p.state).toBe('stalled')
  })

  it('stalled carries a retry', () => {
    const p = proven(q<string[]>({ status: 'pending', failureCount: 2 }))
    if (p.proven || p.state !== 'stalled') throw new Error('should be stalled')
    expect(typeof p.retry).toBe('function')
  })
})

describe('derive — a derived value with no proof prints no value', () => {
  it('derives from proof', () => {
    expect(derive(proven(q({ status: 'success', failureCount: 0, data: [1, 2] })), (v) => v.length))
      .toBe(2)
  })

  it('returns null while loading — never a zero, never a 1', () => {
    expect(derive(proven(q<number[]>({ status: 'pending', failureCount: 0 })), (v) => v.length))
      .toBeNull()
  })

  it('returns null when stalled — the edition number that claimed "No. 1"', () => {
    expect(derive(proven(q<number[]>({ status: 'pending', failureCount: 1 })), (v) => v.length))
      .toBeNull()
  })
})
