# Deploying Medical Docs Vault

This app is a **Next.js** site intended for **[Vercel](https://vercel.com)** (or any Node host) with a **[Supabase](https://supabase.com)** project for auth and Postgres.

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL**: open **SQL Editor** and run schema in order:
   - **Easiest:** paste the single file `supabase/apply_full_schema.sql` from this repo (init + stricter search + trigger in one go).
   - **Or** run the three files under `supabase/migrations/` in name order (`20260419…` then `20260419…` then `20260420…`).
   - **If you only have GitHub:** raw files (replace `main` if your branch differs):  
     `https://raw.githubusercontent.com/subscriptionmanager26-png/medical-docs-web/main/supabase/apply_full_schema.sql`  
     or individual migrations under `.../main/supabase/migrations/`.
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
2. After redirect, the app stores the Google **refresh token** in `google_credentials` (when Google returns one), then **creates the Drive vault folder tree** automatically (`/auth/callback` calls the same sync as uploads). No manual “create folders” step.
3. Upload PDFs/text; the app classifies them and uploads into the matching folder, then **extracts text** (PDFs and common images go through the **OpenAI Responses API**: file is uploaded to OpenAI with `purpose: user_data`, then parsed with `input_file` / `input_image`; it then tries your **fallback model**, default **`gpt-4o`**, if the primary model returns empty—important for scans / photo PDFs). Plain text is read locally. If all OpenAI parse attempts fail for a PDF, the server falls back to `pdf-parse`. Env: `OPENAI_DOCUMENT_PARSE_MODEL`, `OPENAI_DOCUMENT_PARSE_FALLBACK_MODEL`.  
   **Existing users** without valid folder rows: the first upload (or **Profile → Refresh Drive vault folders**) repairs or recreates folders in Drive.

## Vector storage and per-user isolation

- **Where vectors live:** table `public.document_chunks` (column `embedding`, HNSW index). This is your “vector DB” on Supabase; there is **no separate physical database per user** (Postgres multi-tenant pattern).
- **Logical isolation:** every chunk row has `user_id`. **Row Level Security** on `document_chunks` and `documents` ensures users only read/write their own rows. **`match_document_chunks`** only returns rows where `user_id = auth.uid()`.
- **Extra safety:** migration `20260420090000_vector_per_user_isolation.sql` adds a **trigger** so `document_chunks.user_id` always matches the parent `documents.user_id`, and inserts fail if the document is not visible to the current user (prevents cross-tenant `document_id` misuse).
- **Retrieval:** `POST /api/chat` uses merged semantic search. **`GET /api/documents/search?q=...&limit=20`** returns ranked snippets + document metadata for the signed-in user only (same RPC + RLS).
- **Inspect indexed text:** `GET /api/documents/{documentId}/indexed-text` (authenticated) returns the chunk text stored in Supabase for that document—use the **Indexed text** control in the app, or call the API directly when debugging extraction.

If Drive operations fail, sign out and sign in again with **Continue** on Google’s consent so a refresh token is issued.

### Drive upload returns 500 / Google `files` → 403

Vercel logs often show **`POST oauth2.googleapis.com/token` → 200** (refresh works) but **`POST drive/v3/files` → 403**. That means **Google denied creating the file in the parent folder**, not that Supabase auth failed.

Typical causes:

1. **Stale vault folder IDs** — We store `drive_roots` (root + category folder IDs) in Postgres. If the user **deleted or moved** those folders in Drive, uploads used to trust stale IDs. **Fix:** any upload runs **`ensureDriveStructure`**, which **re-checks** IDs and recreates missing folders; or use **Profile → “Refresh Drive vault folders”** (same sync as sign-in).
2. **OAuth consent / `drive.file` scope** — The app needs **`https://www.googleapis.com/auth/drive.file`**. If that user never completed consent (or used an old login without Drive), uploads can fail. **Fix:** sign out, sign in with **Continue** on Google’s Drive permission screen.
3. **Google Workspace policy** — An admin can block third-party Drive access or restrict creating files; that surfaces as **403** from the Drive API.
4. **OAuth app in “Testing”** — Only **test users** listed on the consent screen get full access; others may hit odd failures. Add the user as a test user or publish the app.

### “Request had insufficient authentication scopes” (403, `insufficientPermissions`)

The Google **refresh token** on file was issued **without** `https://www.googleapis.com/auth/drive.file`, so every Drive `files.create` fails even though token refresh returns 200.

**Fix for that user:** sign out of MediSage → sign in with Google again → accept **Drive** on the consent screen. If Google does not show Drive, remove MediSage under **Google Account → Security → Third-party apps with account access**, then sign in again (forces a new refresh token).

**Project checks:**

1. **Google Cloud → OAuth consent screen → Scopes** — Add **`…/auth/drive.file`** (and the usual `openid`, `email`, `profile` if you manage the screen manually). Without `drive.file` on the consent screen, Google will not grant it.
2. **Login request** — The app requests `openid`, `email`, `profile`, and `drive.file` together so the consent screen lists Drive next to sign-in scopes.

Server logs include **`[upload] failed`** with the Google error body; the API returns a clearer message when this scope error is detected.

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

## 7. Google “This app hasn’t been verified” (OAuth verification)

That screen appears when the OAuth **consent screen** is in **Testing** (only listed test users get a smooth flow) or when the app has **not completed Google’s review** for the scopes you use. MediSage requests **`drive.file`** (narrow Drive access) plus the usual **Sign in with Google** profile scopes via Supabase.

### Before you submit

1. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **OAuth consent screen**:
   - **User type**: *External* (typical) or *Internal* only if you use Google Workspace and all users are in your org.
   - Fill **App name**, **User support email**, **Developer contact**.
   - **App domain**: add your **Authorized domains** (e.g. `vercel.app` subdomain or your custom domain—no `https://`).
   - **Application home page**: public URL of your deployed app (e.g. `https://your-app.vercel.app`).
   - **Privacy policy link**: must be **publicly reachable**; should describe use of Google user data and Drive (see [User Data policy](https://developers.google.com/terms/api-services-user-data-policy)). This app ships public pages at **`/privacy`** and **`/tos`** (e.g. `https://medical-docs-web.vercel.app/privacy`).
   - **Scopes**: declare what you actually request (at minimum `drive.file` if you use Drive; Supabase may add `openid`, `email`, `profile`—keep the consent screen in sync with Supabase’s Google provider scopes).
2. **Verify domain ownership** in [Google Search Console](https://search.google.com/search-console) (required for production / verification in most cases). See **§7.1** if Google says your home page is “not registered to you.”
3. Enable **Google Drive API** on the same Cloud project (already needed for uploads).

### 7.1 “The website of your home page URL … is not registered to you”

Google checks that **you control** the **Application home page** URL on the OAuth consent screen (e.g. `https://medical-docs-web.vercel.app`). Fix it with Search Console:

1. **Use a URL-prefix property (not “Domain” for `vercel.app`).**  
   You do **not** own the apex domain `vercel.app`, so do **not** try to verify `vercel.app` as a Domain property. Add a property with type **URL prefix**: exactly  
   `https://medical-docs-web.vercel.app/`  
   (same host and scheme as your live site).

2. **Verify with the HTML tag method.**  
   Search Console will show a `<meta name="google-site-verification" content="…" />` tag. The same verification value is embedded in **`src/app/layout.tsx`** (`GOOGLE_SITE_VERIFICATION`); Next.js emits the meta tag on every page. **Deploy** the latest `main` to Vercel, confirm View Source on the home page contains `google-site-verification`, then click **Verify** in Search Console. If you rotate the token in Search Console, update that constant and redeploy.

3. **Align OAuth consent screen domains.**  
   Under **Authorized domains**, add **`medical-docs-web.vercel.app`** (no `https://`). **Application home page** should be `https://medical-docs-web.vercel.app` (or `/` if the form expects the site root—match what you verified). **Privacy policy** should be on the same host, e.g. `https://medical-docs-web.vercel.app/privacy`.

4. **If Google still will not accept a `*.vercel.app` site** for your use case, connect a **custom domain** you purchase (e.g. `medisage.com`) in Vercel, verify that domain in Search Console, then update the OAuth home page, authorized domains, and policy URLs to use that domain.

Reference: [Google Search Console verification](https://support.google.com/webmasters/answer/9008080).

### Submit for verification

1. **APIs & Services** → **OAuth consent screen** → **Audience**: when ready for real users, move from **Testing** toward **Production** and use **Submit for verification** (wording varies; see [OAuth app verification](https://support.google.com/cloud/answer/13463073) and [sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)).
2. Answer Google’s questionnaire honestly: what the app does, why it needs **Drive** access, demo video if asked.
3. Allow **several business days** for review; fix any follow-up emails from Google.

### While you wait (internal testing)

- Add specific Gmail accounts under **Test users** on the consent screen so they can sign in during **Testing** mode (still may see a warning, but they can proceed).
- Keep a **separate Cloud project** for experiments so production credentials stay stable.

Official references: [Drive API scopes](https://developers.google.com/drive/api/guides/api-specific-auth) · [Minimum scopes / verification](https://support.google.com/cloud/answer/13807380).
