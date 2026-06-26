# RecompTrack - Clean Supabase Starter

This is a clean starting point for RecompTrack with Supabase.

## What's Included

- Supabase client setup
- Basic AuthContext with login state
- Tailwind CSS configured
- TypeScript + React 19 + Vite
- Recommended folder structure

## Setup Instructions

1. **Copy `.env.local.example` to `.env.local`** and fill in your Supabase keys:

```env
VITE_SUPABASE_URL=https://wxevzijnhtczdvlmppro.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Install dependencies:

```bash
npm install
```

3. Run the dev server:

```bash
npm run dev
```

## Next Steps (We'll build these together)

- Login / Signup UI
- Profile creation on first login
- Measurements CRUD (add, view, delete)
- Dashboard with charts
- Withings OAuth integration (Phase 2)

## Folder Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # AuthContext, etc.
├── hooks/          # Custom hooks (useMeasurements, useProfile)
├── lib/            # supabase.ts
├── pages/          # Page-level components
├── types/          # TypeScript interfaces
├── App.tsx
└── main.tsx
```
