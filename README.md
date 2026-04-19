# Medical Docs Vault

Next.js website: Google sign-in (Supabase Auth), Google Drive storage with automatic folder classification, PDF/text indexing, and AI Q&A (OpenAI).

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Configure Supabase and Google as described in **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** (Auth + Postgres + `pgvector`)
- **Google Drive API** (files created by the app)
- **OpenAI** (classification, embeddings, chat)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |
| `npm run lint` | ESLint |

## Publishing

Deploy to **[Vercel](https://vercel.com)** (recommended) or any host that supports Next.js. Full checklist: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.
