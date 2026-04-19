# Deploying Medical Docs Vault

This app is a **Next.js** site intended for **[Vercel](https://vercel.com)** (or any Node host) with a **[Supabase](https://supabase.com)** project for auth and Postgres.

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL**: open **SQL Editor**, paste and run `supabase/migrations/20260419000000_init.sql` (or use Supabase CLI migrations if you prefer).
3. **Authentication → URL configuration**
   - **Site URL**: your production URL, e.g. `https://your-app.vercel.app`.
   - **Redirect URLs**: add  
     `http://localhost:3000/auth/callback`  
     `https://your-app.vercel.app/auth/callback`
4. **Authentication → Providers → Google**
   - Enable Google.
   - Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth client type **Web**).
   - Authorized **JavaScript origins**: your Vercel URL and `http://localhost:3000`.
   - Authorized **redirect URIs**: include Supabase’s callback, e.g.  
     `https://YOUR_PROJECT.supabase.co/auth/v1/callback`  
     (copy exact value from Supabase Google provider page).
   - Paste **Client ID** and **Client Secret** into Supabase.
5. In Google Cloud, enable **Google Drive API** for the same project.

Scopes: the app requests `https://www.googleapis.com/auth/drive.file` at login (files created/opened by this app).

## 2. Environment variables

Copy `.env.example` to `.env.local` for development. For **Vercel** → Project → **Settings → Environment Variables**, add:

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase **API** settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon public** key |
| `GOOGLE_CLIENT_ID` | Same as Supabase Google provider |
| `GOOGLE_CLIENT_SECRET` | Same as Supabase Google provider |
| `OPENAI_API_KEY` | From [OpenAI](https://platform.openai.com/) |

`GOOGLE_OAUTH_REDIRECT_URI` is optional for server-side Drive refresh; leave empty unless your OAuth client requires a fixed redirect.

## 3. Deploy to Vercel

1. Push this folder to **GitHub** (or GitLab/Bitbucket).
2. Import the repo in [vercel.com/new](https://vercel.com/new).
3. Set the environment variables above for **Production** (and **Preview** if you want previews to work).
4. Deploy. Vercel runs `npm run build` by default.

After deploy, update Supabase **Site URL** and **Redirect URLs** to match the live URL if it differs from what you guessed.

## 4. First-time user flow

1. User opens the site → **Sign in with Google** (Drive scope + offline access).
2. After redirect, the app stores the Google **refresh token** in `google_credentials` (when Google returns one).
3. In the app, click **Prepare Drive folders** once to create the root folder and category folders in Drive.
4. Upload PDFs/text; the app classifies them and uploads into the matching folder, then indexes text for Q&A.

If Drive operations fail, sign out and sign in again with **Continue** on Google’s consent so a refresh token is issued.

## 5. Security and compliance

Medical data is sensitive. Before production use: threat model, encryption review, retention/deletion policy, and (if applicable) HIPAA/GDPR and a **Business Associate Agreement** with your vendors.

## 6. Local development

```bash
cd medical-docs-web
cp .env.example .env.local
# fill .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
