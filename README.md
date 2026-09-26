# Latter UP Members Portal

React + Vite + JavaScript + Tailwind CSS + Supabase, deployed on Netlify.

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add your Supabase project URL and anon/publishable key.
5. In Supabase Auth, enable Google and configure its Google OAuth client.
6. Add your local and Netlify callback URLs to Supabase Auth redirect URLs.
7. Run `npm run dev`.

## Environment variables

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The browser app must never contain the Supabase service-role key.

## Current routes

- `/login`
- `/dashboard`
- `/classes`
- `/registration`
- `/contributions`
- `/payments`
- `/directory`
- `/account`

## Auth flow

After Google OAuth, the app calls:

- `link_current_auth_user()`
- `get_my_portal_context()`

These were created in Migration 008.

## Brand

The Tailwind theme uses the Latter UP Brand Visual Identity Guidelines:

- Navy `#001f55`
- Sand `#c7b299`
- Taupe `#736357`
- Sky Blue `#9dc4cb`
- Golden Accent `#e1a730`
- Junior Accent `#f4716d`

Body text uses Barlow Semi Condensed with Barlow Condensed for title-like display text.
