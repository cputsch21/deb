import { Proof } from '../components/Proof'
import { derive, type Proven } from './proof'
import { recordRhythmDrop } from './queries/drops'
import type { EntryMeta, Project, Task } from './types'
import type { LineWhys } from '../lib/lineWhys'

/**
 * THE CAPABILITY REMOVALS, SELF-GUARDING (ruling, July 31 2026).
 *
 * EMPTINESS MUST BE EARNED is a COMPILE-TIME guarantee, so no runtime
 * test can protect it: loosen a generic and every vitest stays green
 * while the law quietly dies. `@ts-expect-error` inverts the assertion —
 * the build now FAILS if one of these lines stops erroring. If you are
 * reading a build failure that points here, a law died; the comment above
 * the line names which one.
 *
 * Nothing imports this file, so it never enters the bundle. `tsc -b`
 * checks it anyway, which is the entire point.
 *
 * The positive checks at the bottom are the other half: they fail if
 * inference DEGRADES. Between the two, the gate cannot rot silently.
 */

declare const tasks: Proven<Task[]>
declare const projects: Proven<Project[]>
declare const meta: Proven<EntryMeta[]>
declare const whys: Proven<LineWhys>
declare const firstDay: Proven<string | null>

declare function useTasksRaw(): import('@tanstack/react-query').UseQueryResult<Task[], Error>

/* ═══════════ the removals — each line MUST error ═══════════ */

export function Removals() {
  // LAW: rows are unreachable without proof. This is the exact shape
  // that shipped the bug — `const { data: tasks = [] } = useTasks()`.
  // @ts-expect-error
  void tasks.value

  // LAW: a Proven is not a list. No .length, no count from nothing.
  // @ts-expect-error
  void tasks.length

  // LAW: a Proven is not iterable — no map/filter/spread past the gate.
  // @ts-expect-error
  void tasks.map

  // LAW: even the failure branch does not carry rows.
  if (!tasks.proven) {
    // @ts-expect-error
    void tasks.value
  }

  // LAW: `state` is not readable while it may be proven — forces the
  // `proven` check first rather than sniffing the state directly.
  // @ts-expect-error
  void tasks.state

  // LAW: a derived value with no proof prints no value. derive() returns
  // R | null, so a caller cannot treat the result as always-there.
  // @ts-expect-error
  const n: number = derive(tasks, (t) => t.length)
  void n

  // LAW: proof comes from `proven()`, never from a raw query result —
  // the gate cannot be fed something that skipped the classifier.
  // @ts-expect-error
  void <Proof of={[useTasksRaw()]} line="x">{() => null}</Proof>
}

/* ═══════════ the component boundary ═══════════ */

/** Stands in for TriageStage: props are plain arrays, by design. */
declare function Stage(props: { tasks: Task[] }): React.ReactNode

export function ComponentBoundary() {
  // LAW: an inner stage cannot be handed an unproven read. This is what
  // makes the split structural rather than conventional.
  // @ts-expect-error
  void <Stage tasks={tasks} />

  // proven rows pass, as they must
  return <Proof of={[tasks]} line="x">{([t]) => <Stage tasks={t} />}</Proof>
}

/* ═══════════ F2: the client drop writer is chute-incapable ═══════════ */

export async function ClientWriterRemovals() {
  // LAW: the browser may not author a row attributed to the email chute.
  // RLS cannot tell a forged chute row from a real one — both are
  // user_id = auth.uid() — so the capability is removed at the type
  // instead. These are not parameters that happen to be passed correctly;
  // they are parameters that do not exist.
  // @ts-expect-error
  await recordRhythmDrop({ source: 'email', rhythmId: 'r', title: 't', code: null, message: 'm' })

  // @ts-expect-error
  await recordRhythmDrop({ outcome: 'filed', rhythmId: 'r', title: 't', code: null, message: 'm' })

  // LAW: it cannot claim an entry either — a rhythm drop has no entry.
  // @ts-expect-error
  await recordRhythmDrop({ entry_id: 'e', rhythmId: 'r', title: 't', code: null, message: 'm' })

  // the sanctioned call, which must keep compiling
  await recordRhythmDrop({ rhythmId: 'r', title: 't', code: null, message: 'm' })
}

/* ═══════════ the positive checks — these MUST compile ═══════════ */

/**
 * Heterogeneous tuple inference through `of`, verified at FOUR and FIVE
 * members including a non-array (LineWhys) and a scalar (string | null).
 * If TypeScript ever widens these to unknown[] or collapses them to a
 * union, the assignments below stop compiling and the build says so —
 * before someone discovers it on conversion site fifteen.
 */
export function TupleHoldsAtFive() {
  return (
    <Proof of={[tasks, projects, meta, whys, firstDay]} line="x">
      {([t, p, m, w, f]) => {
        const a: Task[] = t
        const b: Project[] = p
        const c: EntryMeta[] = m
        const d: LineWhys = w
        const e: string | null = f
        return <span>{a.length + b.length + c.length + d.byId.size + (e ? 1 : 0)}</span>
      }}
    </Proof>
  )
}

export function InferenceIsExactNotAny() {
  return (
    <Proof of={[tasks, projects]} line="x">
      {([t]) => {
        // LAW: the values are precisely typed. If `ValuesOf` ever degrades
        // to any[], this stops erroring and the tuple guarantee is gone.
        // @ts-expect-error
        const wrong: Project[] = t
        return <span>{wrong.length}</span>
      }}
    </Proof>
  )
}
