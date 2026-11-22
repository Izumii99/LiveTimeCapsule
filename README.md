# Living Memory Capsule

A private web app for storing shared screenshots, an opening letter, and exported chat logs between two close gaming friends. Built with Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, and Supabase, configured to run on Vercel and Supabase free tiers.

## What it includes

- Passcode lock screen backed by a timing-safe server check and an HMAC-SHA256 signed `HttpOnly` session cookie (with per-instance failed-attempt rate limiting).
- Opening letter rendered as an interactive sealed envelope, configured from a single file at `src/config/capsule.ts`.
- Gallery in a responsive masonry layout with category filters (`#Moment`, `#FunnyChat`, `#OutfitCheck`, `#ItemGift`), author filters, a permanent open-slot upload card, full-view lightbox, mini note replies, and an optional Time Capsule Lock that blurs photos with a live countdown until the chosen date.
- Client-side WebP compression (`browser-image-compression`, max 0.9 MB / 1920 px) uploaded directly to Supabase Storage through short-lived signed upload URLs, bypassing Vercel's 4.5 MB function payload limit. Deleting a memory removes its storage object as well.
- Chat Highlights tab with two input modes: multi-file `.txt` log import (supporting `[date, time] Name: message` exports with Unicode NFKC font cleanup, deduplication, and append-to-archive) plus a manual quote builder. Clicking an archive opens a searchable chat reader with date dividers and timestamps.
- Floating background music player (paused by default, reading `public/bgm.mp3` with volume controls) and a cursor-reactive midnight starlight canvas that pauses when the tab is hidden and respects `prefers-reduced-motion`.
- Scheduled GitHub Actions workflow (`.github/workflows/keep-alive.yml`) that pings `GET /api/health` every 4 days so a free-tier Supabase project does not auto-pause after 7 days of inactivity.

## Architecture and security

- No Supabase client is bundled or initialized in browser code. Every database read, write, and signed upload URL request runs inside Next.js Route Handlers using server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `supabase/schema.sql` enables Row Level Security on all tables with zero public or authenticated client policies, revokes `anon`/`authenticated` table grants, and grants access only to `service_role`.
- Storage bucket `capsule-media` allows public object reads for rendering uploaded photos while restricting writes to server-generated signed URLs.

## Tech stack

- Next.js 16 (App Router) and React 19
- TypeScript 5 and Tailwind CSS 4
- Framer Motion and Lucide React
- Supabase (PostgreSQL and Storage via `@supabase/supabase-js`)
- `browser-image-compression`

## Project structure

```text
.
├── .env.example
├── .github/
│   └── workflows/
│       └── keep-alive.yml
├── next.config.ts
├── public/
│   └── bgm.mp3
├── supabase/
│   └── schema.sql
├── tests/
│   ├── auth.check.ts
│   ├── chat-parser.check.ts
│   └── validation.check.ts
├── SETUP_GUIDE.md
└── src/
    ├── config/
    │   └── capsule.ts
    ├── lib/
    │   ├── auth-core.ts
    │   ├── auth.ts
    │   ├── chat-parser.ts
    │   ├── format.ts
    │   ├── supabase.ts
    │   ├── types.ts
    │   ├── upload-client.ts
    │   └── validation.ts
    ├── components/
    │   ├── AddChatModal.tsx
    │   ├── AuthorBadge.tsx
    │   ├── BgmPlayer.tsx
    │   ├── CapsuleGate.tsx
    │   ├── CapsuleMark.tsx
    │   ├── CapsuleWorkspace.tsx
    │   ├── ChatBubbleStream.tsx
    │   ├── ChatHighlights.tsx
    │   ├── ChatReaderModal.tsx
    │   ├── InteractiveMidnightBg.tsx
    │   ├── LockScreen.tsx
    │   ├── MemoryCard.tsx
    │   ├── MemoryGallery.tsx
    │   ├── MemoryLightbox.tsx
    │   ├── OpeningLetter.tsx
    │   ├── ToastProvider.tsx
    │   └── UploadMemoryModal.tsx
    └── app/
        ├── globals.css
        ├── layout.tsx
        ├── page.tsx
        └── api/
            ├── health/route.ts
            ├── auth/{lock,session,unlock}/route.ts
            ├── storage/sign-upload/route.ts
            ├── memories/route.ts & [id]/route.ts
            ├── notes/route.ts & [id]/route.ts
            └── chats/route.ts & [id]/route.ts
```

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CAPSULE_PASSCODE`, and a 64-character hex `AUTH_SECRET`.
3. Run `supabase/schema.sql` once in the Supabase SQL Editor.
4. Start the dev server:
   ```bash
   npm run dev
   ```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for full Supabase, Vercel, and GitHub Actions setup steps.

## Scripts

```bash
npm run dev       # Local development server
npm test          # Auth, validation, and chat parser assertions
npm run typecheck # TypeScript type checking
npm run lint      # ESLint checks
npm run build     # Production build
```
