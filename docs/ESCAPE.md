pre-merge main: 6c7171d  (branch pre-x1-r2)
archive of the abandoned local session:
  abandoned/local-parallel-2026-07-30

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
