import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900"
            aria-current="page"
          >
            MediSage
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600">
            <Link href="/login" className="hover:text-zinc-900">
              Sign in
            </Link>
            <Link
              href="/app"
              className="rounded-full bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800"
            >
              Open app
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-16 sm:py-24">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-emerald-700">
          MediSage — health data copilot
        </p>
        <h1 className="mt-4 text-center text-5xl font-semibold tracking-tight text-zinc-900 sm:text-6xl">
          MediSage
        </h1>
        <p className="mt-4 max-w-2xl text-center text-xl font-medium text-zinc-700 sm:text-2xl">
          Your private vault for medical documents—organized in your Google Drive and
          searchable with AI.
        </p>
        <p className="mt-5 max-w-xl text-center text-base leading-relaxed text-zinc-600">
          MediSage signs you in with Google, uses your Drive with narrow permissions,
          sorts uploads into folders, and lets you ask questions that cite your own
          files—not the public web.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Sign in with Google
          </Link>
          <Link
            href="/app"
            className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Open MediSage
          </Link>
        </div>
        <p className="mt-14 max-w-lg text-center text-xs text-zinc-500">
          MediSage is a template for builders: before using it for real patient data,
          complete your own security and compliance review. Sessions use Supabase;
          files stay in the account owner&apos;s Google Drive.
        </p>
        <p className="mt-8 text-center text-xs text-zinc-500">
          <Link href="/privacy" className="underline underline-offset-2 hover:text-zinc-700">
            Privacy Policy
          </Link>
          <span className="mx-2 text-zinc-300">·</span>
          <Link href="/tos" className="underline underline-offset-2 hover:text-zinc-700">
            Terms of Service
          </Link>
        </p>
      </main>
    </div>
  );
}
