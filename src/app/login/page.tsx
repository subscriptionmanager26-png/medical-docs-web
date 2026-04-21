import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900">
          Sign in
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Use your Google account to store documents in your Drive and ask
          questions about them.
        </p>
        {searchParams.error ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
            Something went wrong ({searchParams.error}). Try again.
          </p>
        ) : null}
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-8 text-center text-xs text-zinc-500">
          <Link href="/privacy" className="underline underline-offset-2 hover:text-zinc-700">
            Privacy
          </Link>
          <span className="mx-2 text-zinc-300">·</span>
          <Link href="/tos" className="underline underline-offset-2 hover:text-zinc-700">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
