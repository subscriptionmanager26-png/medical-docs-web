import Link from "next/link";
import { Suspense } from "react";
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
          <strong className="font-semibold text-medi-ink">Google Drive access is required</strong> — we
          only use files and folders this app creates. You&apos;ll be asked to allow that on the same
          Google sign-in screen.
        </p>
        {searchParams.error ? (
          <p className="mt-4 rounded-2xl border border-medi-warning/40 bg-medi-warning/10 px-3 py-2 text-center text-sm text-medi-ink">
            {searchParams.error === "drive_required" ? (
              <>
                Google did not grant Drive access for this sign-in. Try again, choose{" "}
                <strong>Allow</strong> for Drive (app-specific files), and do not turn that permission
                off on Google&apos;s consent screen.
              </>
            ) : searchParams.error === "no_refresh" ? (
              <>
                We could not get long-term Google access. Try signing in again. If it keeps happening,
                open Google Account → Security → third-party app access, remove MediSage, then sign
                in once more.
              </>
            ) : (
              <>Something went wrong ({searchParams.error}). Try again.</>
            )}
          </p>
        ) : null}
        <div className="mt-8">
          <Suspense
            fallback={
              <div className="flex h-12 w-full items-center justify-center rounded-2xl border border-medi-line bg-medi-canvas text-sm text-medi-muted">
                Loading…
              </div>
            }
          >
            <LoginForm />
          </Suspense>
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
