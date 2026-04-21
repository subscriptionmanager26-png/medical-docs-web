import Link from "next/link";

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24" id={id}>
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function LegalDocShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-zinc-900 hover:text-zinc-700"
          >
            MediSage
          </Link>
          <nav className="flex gap-6 text-sm text-zinc-600">
            <Link href="/privacy" className="hover:text-zinc-900">
              Privacy
            </Link>
            <Link href="/tos" className="hover:text-zinc-900">
              Terms
            </Link>
            <Link href="/login" className="hover:text-zinc-900">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: {lastUpdated}</p>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-zinc-700">
          {children}
        </div>
      </main>
    </div>
  );
}
