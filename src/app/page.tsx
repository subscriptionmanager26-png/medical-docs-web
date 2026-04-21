import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-medi-canvas">
      <header className="border-b border-medi-line bg-white shadow-medi-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-medi-ink"
            aria-current="page"
          >
            MediSage
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-medi-muted">
            <Link href="/login" className="transition hover:text-medi-ink">
              Sign in
            </Link>
            <Link
              href="/app"
              className="rounded-2xl bg-medi-accent px-4 py-2 text-white shadow-sm transition hover:bg-medi-accent-hover active:scale-[0.98]"
            >
              Open app
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl rounded-3xl border border-medi-line bg-white px-8 py-12 text-center shadow-medi-card sm:px-12">
          <p className="text-sm font-medium uppercase tracking-wide text-medi-accent">
            MediSage — health data copilot
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-medi-ink sm:text-5xl">
            MediSage
          </h1>
          <p className="mt-4 text-lg font-medium leading-snug text-medi-ink sm:text-xl">
            Your private vault for medical documents—organized in your Google Drive
            and searchable with AI.
          </p>
          <p className="mt-5 text-sm leading-relaxed text-medi-muted sm:text-base">
            MediSage signs you in with Google, uses your Drive with narrow permissions,
            sorts uploads into folders, and lets you ask questions that cite your own
            files—not the public web.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-11 min-w-[200px] items-center justify-center rounded-2xl bg-medi-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-medi-accent-hover active:scale-[0.98]"
            >
              Sign in with Google
            </Link>
            <Link
              href="/app"
              className="inline-flex min-h-11 min-w-[200px] items-center justify-center rounded-2xl border border-medi-line bg-white px-6 py-3 text-sm font-semibold text-medi-ink shadow-sm transition hover:bg-medi-canvas active:scale-[0.98]"
            >
              Open MediSage
            </Link>
          </div>
        </div>

        <p className="mt-12 max-w-lg text-center text-xs text-medi-muted">
          MediSage is a template for builders: before using it for real patient data,
          complete your own security and compliance review. Sessions use Supabase;
          files stay in the account owner&apos;s Google Drive.
        </p>
        <p className="mt-8 text-center text-xs text-medi-muted">
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-medi-ink"
          >
            Privacy Policy
          </Link>
          <span className="mx-2 text-medi-line">·</span>
          <Link href="/tos" className="underline underline-offset-2 hover:text-medi-ink">
            Terms of Service
          </Link>
        </p>
      </main>
    </div>
  );
}
