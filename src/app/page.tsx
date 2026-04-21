import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Private document vault
        </p>
        <h1 className="mt-3 max-w-2xl text-center text-4xl font-semibold tracking-tight text-zinc-900">
          Store medical documents in your Google Drive and ask questions safely.
        </h1>
        <p className="mt-4 max-w-xl text-center text-lg text-zinc-600">
          Sign in with Google, grant Drive access, upload files—we sort them into
          folders and let you search them with AI.
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
            Open app
          </Link>
        </div>
        <p className="mt-12 max-w-lg text-center text-xs text-zinc-500">
          For a production medical product, complete a security and compliance
          review. This template encrypts sessions via Supabase and keeps files in
          the user&apos;s own Drive.
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
