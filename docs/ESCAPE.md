pre-merge main: 6c7171d  (branch pre-x1-r2)
archive of the abandoned local session:
  abandoned/local-parallel-2026-07-30

pre-S1 main: a05bcdf   (S1 = "emptiness must be earned" — the Proven<T>
                        gate; branch s1/emptiness-must-be-earned kept)
undo S1 entirely:   git fetch origin && git checkout main && git pull && git revert --no-edit -m 1 5311d3b && git push

S1 merged as 5311d3b on July 31 2026, NOT squashed, so any single piece
reverts alone — `git log --oneline a05bcdf..5311d3b` lists the fourteen.
No schema change in any of them; the revert is complete.

If you are reverting because the app got LOUDER about failures, that is
S1 working, not S1 broken. What it changed is that a failed read now says
so instead of rendering an empty page. Revert the whole thing only if it
is wrong about something being broken.

TESTED July 31 2026 on a throwaway branch cut from main. All code reverts
CLEAN — the build stays green and the suite drops back to its pre-S1
count of 79, which is the proof it went all the way back. EXPECT ONE
CONFLICT, in this file and only this file, because these very lines
describe the merge being undone. Resolve and continue:

    git checkout --ours docs/ESCAPE.md && git add docs/ESCAPE.md && git revert --continue

Then delete the S1 block above by hand, since it now describes something
that is no longer in main.

undo everything:    git fetch origin && git checkout main && git pull && git revert --no-edit -m 1 bad1d86 85378a1 && git push
world-ink only:     git revert --no-edit bad1d86 && git push
R2 only:            git revert --no-edit 348d569 && git push
X1 only (Arc back): git revert --no-edit 39ec4d8 && git push

---
TESTED July 30, 2026 on a throwaway branch. All four lines run.
(--no-edit added so git never drops you into an editor mid-panic.)

EXPECT ONE CONFLICT on "undo everything": DECISIONS.md, and only
DECISIONS.md. All code reverts clean. The log is append-at-top, so any
ruling written after July 30 sits where the X1/R2 entries are being
removed. This will happen every time. Resolve it and continue:

    git checkout --ours DECISIONS.md && git add DECISIONS.md && git revert --continue

"--ours" keeps the log exactly as it reads today, which is what you want:
the record of what was built is never erased by undoing the build. Then
add a dated entry saying you reverted, and why.
