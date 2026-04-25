"use client";

import { useState } from "react";

const defaultFrom = "2020-01-01T00:00:00.000Z";

export function CasRequestForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password@123");
  const [pan, setPan] = useState("");
  const [fromIso, setFromIso] = useState(defaultFrom);
  const [toIso, setToIso] = useState(() => new Date().toISOString());
  const [includeZeroBalFolios, setIncludeZeroBalFolios] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/cas/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          pan: pan.trim() || undefined,
          fromDate: fromIso,
          toDate: toIso,
          zeroBalFolio: includeZeroBalFolios ? "Y" : "N",
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; ok?: boolean; status?: unknown; detail?: unknown }
        | null;
      if (!res.ok) {
        setError(json?.error ?? `Request failed (${res.status})`);
        return;
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(ev) => void onSubmit(ev)}
      className="mt-8 flex flex-col gap-5"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-medi-ink">CAMS-registered email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="h-11 rounded-2xl border border-medi-line bg-white px-3 text-medi-ink outline-none ring-medi-accent/30 focus:ring-2"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-medi-ink">Statement PDF password</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          className="h-11 rounded-2xl border border-medi-line bg-white px-3 text-medi-ink outline-none ring-medi-accent/30 focus:ring-2"
        />
        <span className="text-xs text-medi-muted">
          Default used by CAMS/KFintech email delivery is often{" "}
          <code className="rounded bg-medi-canvas px-1">Password@123</code> — use
          the password you set on CAMS.
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-medi-ink">PAN (optional)</span>
        <input
          type="text"
          value={pan}
          onChange={(ev) => setPan(ev.target.value.toUpperCase())}
          maxLength={10}
          className="h-11 rounded-2xl border border-medi-line bg-white px-3 font-mono text-medi-ink outline-none ring-medi-accent/30 focus:ring-2"
        />
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-medi-ink">
        <input
          type="checkbox"
          checked={includeZeroBalFolios}
          onChange={(ev) => setIncludeZeroBalFolios(ev.target.checked)}
          className="mt-1 size-4 rounded border-medi-line text-medi-accent"
        />
        <span>
          Include zero-balance folios (<code className="rounded bg-medi-canvas px-1">zero_bal_folio=Y</code>). Leave
          off to match CAMS default <code className="rounded bg-medi-canvas px-1">N</code>.
        </span>
      </label>
      <p className="text-xs leading-relaxed text-medi-muted">
        Period bounds are sent as <strong className="font-semibold text-medi-ink">DD-Mon-YYYY</strong> (e.g.{" "}
        <code className="rounded bg-medi-canvas px-1">01-Apr-2026</code>) using{" "}
        <strong className="font-semibold text-medi-ink">Asia/Kolkata</strong>. The response includes{" "}
        <code className="rounded bg-medi-canvas px-1">datesSent</code> and <code className="rounded bg-medi-canvas px-1">zeroBalFolioSent</code>.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-medi-ink">From (ISO instant)</span>
          <input
            type="text"
            value={fromIso}
            onChange={(ev) => setFromIso(ev.target.value)}
            className="h-11 rounded-2xl border border-medi-line bg-white px-3 font-mono text-xs text-medi-ink outline-none ring-medi-accent/30 focus:ring-2 sm:text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-medi-ink">To (ISO instant)</span>
          <input
            type="text"
            value={toIso}
            onChange={(ev) => setToIso(ev.target.value)}
            className="h-11 rounded-2xl border border-medi-line bg-white px-3 font-mono text-xs text-medi-ink outline-none ring-medi-accent/30 focus:ring-2 sm:text-sm"
          />
        </label>
      </div>
      {error ? (
        <p className="rounded-2xl border border-medi-danger/30 bg-medi-danger/10 px-3 py-2 text-sm text-medi-danger">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-medi-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-medi-accent-hover active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "Contacting CAMS…" : "Request consolidated statement"}
      </button>
      {result ? (
        <pre className="max-h-80 overflow-auto rounded-2xl border border-medi-line bg-medi-canvas p-3 text-xs text-medi-ink">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
