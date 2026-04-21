"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: signError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/app`,
        scopes: "https://www.googleapis.com/auth/drive.file",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {error ? (
        <p className="rounded-2xl border border-medi-danger/30 bg-medi-danger/10 px-3 py-2 text-sm text-medi-danger">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        disabled={loading}
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-medi-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-medi-accent-hover active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      <p className="text-center text-xs text-medi-muted">
        You will be asked to sign in and allow access to Google Drive files that
        this app creates or opens.
      </p>
    </div>
  );
}
