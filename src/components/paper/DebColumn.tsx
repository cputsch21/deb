import { useMessages } from '../../db/queries/messages'
import { MorningBrief } from '../rooms/MorningBrief'

/**
 * DEB, THE COLUMNIST — the Paper's right column (P3). A READ of
 * existing thread data, never new state (July 29 ruling): the brief as
 * her lead piece (pages-first gate intact — MorningBrief carries the
 * invitation, the gate, and the honest degradation unchanged), then her
 * latest remarks from the thread, scoped by where the words were spoken
 * (thread law). The whole column is a door: engaging it is CONVERSATION
 * focus, where the thread takes the stage at full measure.
 */
export function DebColumn({ lens, onOpen }: { lens: string | null; onOpen: () => void }) {
  const { data: messages = [] } = useMessages(lens)
  const remarks = messages.filter((m) => m.role === 'deb').slice(-2)

  // a div-door, not a <button>: the brief inside carries its own retry
  // button and nesting interactives breaks both. The zone is the door.
  return (
    <div
      onClick={onOpen}
      className="group -mx-3.5 block cursor-pointer rounded-[14px] px-3.5 pt-1 pb-2 text-left transition-colors hover:bg-fill"
    >
      {/* the lead piece: the brief, whole-life only (its own law) */}
      {lens === null && (
        <div className="[&>div]:mb-4 [&>div]:border-0 [&>div]:pb-0">
          <MorningBrief />
        </div>
      )}

      {/* her latest remarks — the thread's tail, reprinted */}
      {remarks.map((m) => (
        <div key={m.id} className="mt-5 first:mt-1">
          <div className="eyebrow text-[0.56rem] font-semibold text-dim">
            <span className="text-accent-ink">deb</span> · {timeOf(m.created_at)}
          </div>
          <p className="mt-1.5 line-clamp-6 font-serif text-[15px] leading-[1.62] text-ink">
            {m.content}
          </p>
        </div>
      ))}

      {remarks.length === 0 && lens !== null && (
        <p className="mt-1 font-serif text-[14.5px] text-dim italic">
          Nothing said in this world yet — the thread is open.
        </p>
      )}

      <span className="eyebrow mt-4 block text-[0.58rem] text-dim transition-colors group-hover:text-ink">
        open the thread →
      </span>
    </div>
  )
}

function timeOf(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?([AP])M$/i, (_, p: string) => p.toLowerCase())
}
