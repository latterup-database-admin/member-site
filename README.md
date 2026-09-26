# Latter UP Members Portal

React + Vite + JavaScript + Tailwind + Supabase member portal.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Add your Supabase browser values to `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

## Preview the dashboard before Google OAuth is ready

For local development only, add this to `.env.local`:

```env
VITE_DEV_PREVIEW=true
```

Then restart `npm run dev` and open `/dashboard`.

Preview mode is guarded by `import.meta.env.DEV`, so it does not activate in a production Vite build even if the variable were accidentally configured there. It is for UI development only and is not authentication.

## Production auth

When Google OAuth is configured, remove or set:

```env
VITE_DEV_PREVIEW=false
```

The normal portal flow uses Supabase Auth, `link_current_auth_user()`, `get_my_portal_context()`, and database RLS.
