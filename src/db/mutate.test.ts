import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { assertRowChanged, capText, optimisticWrite } from './mutate'
import { usePill } from '../lib/undo'

const KEY = ['tasks'] as const

describe('optimisticWrite', () => {
  it('patches the cache synchronously and keeps it on success', async () => {
    const qc = new QueryClient()
    qc.setQueryData(KEY, ['a'])

    const write = optimisticWrite(qc, {
      keys: [KEY],
      patch: () => qc.setQueryData(KEY, ['a', 'b']),
      persist: async () => {},
      onFail: 'nope',
    })

    // the <50ms law: visible before the save settles
    expect(qc.getQueryData(KEY)).toEqual(['a', 'b'])
    await expect(write).resolves.toBe(true)
    expect(qc.getQueryData(KEY)).toEqual(['a', 'b'])
  })

  it('rolls back and raises a notice when the save fails', async () => {
    const qc = new QueryClient()
    qc.setQueryData(KEY, ['a'])

    const write = optimisticWrite(qc, {
      keys: [KEY],
      patch: () => qc.setQueryData(KEY, ['a', 'b']),
      persist: async () => {
        throw new Error('db down')
      },
      onFail: 'that did not save',
    })

    expect(qc.getQueryData(KEY)).toEqual(['a', 'b']) // optimistic first…
    await expect(write).resolves.toBe(false)
    expect(qc.getQueryData(KEY)).toEqual(['a']) // …truth restored
    expect(usePill.getState().pill).toMatchObject({
      kind: 'notice',
      label: 'that did not save',
    })
  })
})

describe('assertRowChanged', () => {
  it('throws loud on zero rows', () => {
    expect(() => assertRowChanged([], null, 'task 1')).toThrow(/Zero rows/)
    expect(() => assertRowChanged(null, null, 'task 1')).toThrow(/Zero rows/)
  })

  it('throws on a database error', () => {
    expect(() => assertRowChanged(null, { message: 'boom' }, 'task 1')).toThrow(/boom/)
  })

  it('passes when a row changed', () => {
    expect(() => assertRowChanged([{ id: '1' }], null, 'task 1')).not.toThrow()
  })
})

describe('capText', () => {
  it('trims whitespace and caps length', () => {
    expect(capText('  hi  ', 80)).toBe('hi')
    expect(capText('x'.repeat(300), 200)).toHaveLength(200)
  })
})
