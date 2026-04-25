"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const next = safeNextPath(searchParams.get("next"));
    const { error: signError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        scopes: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/drive.file",
        ].join(" "),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          /** Single authorization bundle; avoids incremental “add more later” behavior when possible. */
          include_granted_scopes: "false",
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
        <strong className="font-semibold text-medi-ink">Drive access is required</strong> — MediSage
        only uses files and folders it creates. On Google&apos;s screen, keep Drive permission
        enabled, then choose Allow, or sign-in cannot finish.
      </p>
    </div>
  );
}
