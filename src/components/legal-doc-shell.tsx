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
      <h2 className="text-base font-semibold text-medi-ink">{title}</h2>
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
    <div className="min-h-screen bg-medi-canvas text-medi-ink">
      <header className="border-b border-medi-line bg-white shadow-medi-card">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-medi-ink hover:text-medi-accent"
          >
            MediSage
          </Link>
          <nav className="flex gap-6 text-sm text-medi-muted">
            <Link href="/privacy" className="hover:text-medi-ink">
              Privacy
            </Link>
            <Link href="/tos" className="hover:text-medi-ink">
              Terms
            </Link>
            <Link href="/login" className="hover:text-medi-ink">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight text-medi-ink">
          {title}
        </h1>
        <p className="mt-2 text-sm text-medi-muted">Last updated: {lastUpdated}</p>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-medi-muted">
          {children}
        </div>
      </main>
    </div>
  );
}
