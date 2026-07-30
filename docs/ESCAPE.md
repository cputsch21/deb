pre-merge main: 6c7171d  (branch pre-x1-r2)
archive of the abandoned local session:
  abandoned/local-parallel-2026-07-30

undo everything:    git fetch origin && git checkout main && git pull && git revert bad1d86 && git revert -m 1 85378a1 && git push
world-ink only:     git revert bad1d86 && git push
R2 only:            git revert 348d569 && git push
X1 only (Arc back): git revert 39ec4d8 && git push
