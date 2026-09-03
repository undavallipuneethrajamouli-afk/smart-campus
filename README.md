# Smart Campus

Unified college management and smart-campus platform for students, faculty, HODs, admins, support staff, and alumni.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Supabase](https://supabase.com) — Postgres, Auth, Storage, Row Level Security
- Tailwind CSS

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and fill in your Supabase project's URL and keys (Project Settings → API in the Supabase dashboard).

3. In the Supabase SQL Editor, run `supabase/schema.sql` then `supabase/seed.sql`.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `src/app` — routes (App Router), grouped by role under `dashboard/`
- `src/lib/supabase` — browser/server/admin Supabase clients
- `src/lib/auth.ts` — role-based access helpers (`requireRole`)
- `supabase/schema.sql` — database schema + Row Level Security policies
- `supabase/seed.sql` — demo seed data (departments, subjects) — not real user data
