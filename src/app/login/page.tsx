import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-medi-canvas px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-medi-line bg-white p-8 shadow-medi-card sm:p-10">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-medi-accent">
          MediSage
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-medi-ink">
          Sign in
        </h1>
        <p className="mt-2 text-center text-sm text-medi-muted">
          Use your Google account to store documents in your Drive and ask questions
          about them.
        </p>
        {searchParams.error ? (
          <p className="mt-4 rounded-2xl border border-medi-warning/40 bg-medi-warning/10 px-3 py-2 text-center text-sm text-medi-ink">
            Something went wrong ({searchParams.error}). Try again.
          </p>
        ) : null}
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-8 text-center text-xs text-medi-muted">
          <Link href="/privacy" className="underline underline-offset-2 hover:text-medi-ink">
            Privacy
          </Link>
          <span className="mx-2 text-medi-line">·</span>
          <Link href="/tos" className="underline underline-offset-2 hover:text-medi-ink">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
