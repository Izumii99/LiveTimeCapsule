# Living Memory Capsule — Setup & Deployment Guide

Private shared memory vault built with Next.js (App Router), Tailwind CSS, Framer Motion, and Supabase, configured for free-tier deployment on Vercel + Supabase.

## Project Structure

```text
.
├── .env.example
├── .github/
│   └── workflows/
│       └── keep-alive.yml       # Pings /api/health every 4 days to avoid Supabase pause
├── next.config.ts               # Allows remote images from *.supabase.co
├── public/                      # Place optional bgm.mp3 here for the floating music player
├── supabase/
│   └── schema.sql               # Idempotent tables, default-deny RLS, and capsule-media bucket
├── tests/
│   ├── auth.check.ts            # Native Node assert checks for passcode & HMAC cookies
│   └── validation.check.ts      # Trust-boundary & upload path validation checks
└── src/
    ├── config/
    │   └── capsule.ts           # Edit names, nicknames, opening letter, and BGM title here
    ├── lib/
    │   ├── auth-core.ts         # Timing-safe passcode verification & HMAC-SHA256 tokens
    │   ├── auth.ts              # HttpOnly cookie helpers & requireAuth() guard
    │   ├── supabase.ts          # Server-only Supabase admin client
    │   ├── upload-client.ts     # Client WebP compression (<1 MB) + signed URL direct PUT
    │   ├── validation.ts        # Strict allowlists & input validators
    │   ├── format.ts            # Date, countdown, and byte formatting helpers
    │   └── types.ts             # Shared TypeScript interfaces
    ├── components/
    │   ├── InteractiveMidnightBg.tsx # Cursor-reactive starlight & ambient aurora canvas
    │   ├── LockScreen.tsx       # Passcode gate UI
    │   ├── CapsuleGate.tsx      # Session state switcher
    │   ├── CapsuleWorkspace.tsx # Navigation shell (Letter, Gallery, Chat Highlights)
    │   ├── OpeningLetter.tsx    # Interactive sealed envelope letter
    │   ├── BgmPlayer.tsx        # Floating audio player (paused by default)
    │   ├── MemoryGallery.tsx    # Masonry gallery, filters, and open-slot card
    │   ├── MemoryCard.tsx       # Polaroid card + live Time Capsule countdown
    │   ├── UploadMemoryModal.tsx
    │   ├── MemoryLightbox.tsx   # Full view, delete confirmation, and mini notes thread
    │   ├── ChatHighlights.tsx   # Dual-side chat bubble archive & .txt importer
    │   ├── ChatBubbleStream.tsx # Date dividers, timestamps, and auto side alignment
    │   ├── ChatReaderModal.tsx  # Full searchable reader with append .txt
    │   ├── AddChatModal.tsx
    │   └── ToastProvider.tsx
    └── app/
        ├── page.tsx             # Server-side initial auth check
        ├── layout.tsx           # Plus Jakarta Sans + Lora fonts & midnight theme
        └── api/
            ├── health/route.ts
            ├── auth/{unlock,lock,session}/route.ts
            ├── storage/sign-upload/route.ts
            ├── memories/route.ts & [id]/route.ts
            ├── notes/route.ts & [id]/route.ts
            └── chats/route.ts & [id]/route.ts
```

## 1. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in the Supabase dashboard.
3. Paste the entire contents of `supabase/schema.sql` and click **Run**.
   - Creates `memories`, `memory_notes`, `gifted_items`, and `chat_highlights`.
   - Enables Row Level Security (RLS) with no public policies so direct browser access is blocked.
   - Creates the `capsule-media` storage bucket with public read access and server-only writes.
4. Go to **Project Settings -> API** and copy:
   - **Project URL** (`SUPABASE_URL`)
   - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`)

Never prefix either value with `NEXT_PUBLIC_`.

## 2. Configure Local Environment & Personal Copy

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Generate a 64-character hex secret for `AUTH_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Fill `.env.local`:
   ```env
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   CAPSULE_PASSCODE=<your-shared-secret>
   AUTH_SECRET=<64-char-hex-output>
   ```
4. *(Optional)* Customize copy, names, nicknames, or the opening letter in `src/config/capsule.ts`.
5. *(Optional)* Drop a lightweight `.mp3` track at `public/bgm.mp3` to enable the floating music player.
6. Run locally:
   ```bash
   npm install
   npm run dev
   ```

## 3. Deploy to Vercel

1. Push this project to a GitHub repository (private repositories work on Vercel Hobby).
2. Import the repository at [vercel.com/new](https://vercel.com/new).
3. Under **Environment Variables**, add the same four server-only keys:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CAPSULE_PASSCODE`
   - `AUTH_SECRET`
4. Click **Deploy**.
5. Once live, verify `https://<your-app>.vercel.app/api/health` returns HTTP `200` with `{"status":"ok",...}`.

## 4. Enable Supabase Anti-Pause Cron

Free-tier Supabase projects pause after 7 days without database activity. The workflow in `.github/workflows/keep-alive.yml` pings `/api/health` every 4 days.

1. In your GitHub repository, open **Settings -> Secrets and variables -> Actions**.
2. Click **New repository secret**:
   - **Name:** `APP_URL`
   - **Value:** `https://<your-app>.vercel.app` (no trailing slash needed)
3. Open the **Actions** tab, choose **Supabase Keep-Alive**, and click **Run workflow** once to confirm it receives HTTP `200`.

## Verification Commands

```bash
npm test          # Auth & validation assertions
npm run typecheck # TypeScript check
npm run lint      # ESLint check
npm run build     # Production Next.js build
```
