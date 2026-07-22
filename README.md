# MyOS

A personal operating system for turning goals into reality.
Projects · Goals · Tasks · an AI Mentor · a triaged Context Inbox ·
a Today List · a Friday Impact Check.

The dated record of every product/architecture decision — and the source of
truth when docs disagree — is [`DECISIONS.md`](DECISIONS.md).

## Stack

React 19 + Vite + TypeScript · Tailwind CSS v4 · Supabase (Postgres + auth,
RLS everywhere) · Vercel serverless + AI SDK + Claude · TanStack Query +
Zustand · **pnpm only** (one lockfile).

## Run it

```bash
cp .env.example .env.local   # then fill in the Supabase values
pnpm install
pnpm dev                     # http://localhost:5173
pnpm build                   # typecheck + production build
pnpm test                    # vitest
```
