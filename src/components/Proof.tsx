import type { ReactNode } from 'react'
import type { Proven } from '../db/proof'

/**
 * The gate that turns proof into children — the render half of
 * EMPTINESS MUST BE EARNED (see src/db/proof.ts for the law).
 *
 * A surface hands it every query it depends on. The children run only
 * when ALL of them have actually succeeded, and they receive plain
 * values, so the inner component's props are `Task[]` and it is
 * unrenderable without proof. That is the whole enforcement.
 *
 *   <Proof of={[tasks, projects]} what="The verdicts aren't loading">
 *     {([tasks, projects]) => <Stage tasks={tasks} projects={projects} />}
 *   </Proof>
 *
 * Per-column, never whole-page (ruling, July 31): each column speaks for
 * itself and the rest of the page stays true. Nuking a loaded board
 * because one query coughed is the same crime inverted.
 */

type ValuesOf<Ps extends readonly Proven<unknown>[]> = {
  [K in keyof Ps]: Ps[K] extends Proven<infer T> ? T : never
}

type Unproven = Extract<Proven<unknown>, { proven: false }>

export function Proof<Ps extends readonly Proven<never>[]>({
  of,
  what,
  children,
}: {
  of: readonly [...Ps]
  /** The clause before the em dash: "The verdicts aren't loading" */
  what: string
  children: (values: ValuesOf<Ps>) => ReactNode
}) {
  const unproven = of.filter((p) => !p.proven) as Unproven[]

  if (unproven.length === 0) {
    const values = of.map((p) => (p as { proven: true; value: unknown }).value)
    return <>{children(values as ValuesOf<Ps>)}</>
  }

  // Nothing has gone wrong yet — render nothing. No skeletons, by law.
  if (unproven.every((p) => p.state === 'loading')) return null

  // Something has. One line, in the slot the lie would have occupied.
  const retries = unproven.flatMap((p) => (p.state === 'stalled' ? [p.retry] : []))
  return <Stalled what={what} onRetry={() => retries.forEach((r) => r())} />
}

/**
 * The failure line (copy approved July 31). Deb's register: plain, true,
 * answers the fear rather than describing the fault. No box, no icon, no
 * colour, no badge — NO GUILT PIXELS. It disappears without ceremony
 * because the gate simply re-renders; there is no recovered state.
 */
export function Stalled({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <p className="py-1 font-serif text-[14.5px] leading-[1.5] text-muted italic">
      {what} &mdash; nothing is lost.{' '}
      <button
        onClick={onRetry}
        className="eyebrow -my-2 min-h-11 align-middle text-[0.58rem] text-dim not-italic transition-colors hover:text-ink"
      >
        try again
      </button>
    </p>
  )
}
