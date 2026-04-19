"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  UPLOAD_STEP_LABELS,
  type UploadStepId,
  type UploadStreamEvent,
} from "@/lib/upload-stream-protocol";

type Doc = {
  id: string;
  title: string;
  category: string;
  mime_type: string | null;
  drive_file_id: string;
  created_at: string;
};

type UploadStepUi = "pending" | "active" | "done" | "error";

type UploadOutcome =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

const INITIAL_UPLOAD_STEPS: Record<UploadStepId, UploadStepUi> = {
  reading: "pending",
  folder: "pending",
  saving: "pending",
};

function markFirstIncompleteAsError(
  steps: Record<UploadStepId, UploadStepUi>,
): Record<UploadStepId, UploadStepUi> {
  const order: UploadStepId[] = ["reading", "folder", "saving"];
  const next = { ...steps };
  const first = order.find((s) => next[s] !== "done");
  if (first) next[first] = "error";
  return next;
}

export function AppShell() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStepUi, setUploadStepUi] = useState<
    Record<UploadStepId, UploadStepUi> | null
  >(null);
  const [uploadOutcome, setUploadOutcome] = useState<UploadOutcome | null>(null);
  const [folderStepDetail, setFolderStepDetail] = useState<string | null>(null);
  const [indexingFollowUp, setIndexingFollowUp] = useState(false);
  const [initing, setIniting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [chatQ, setChatQ] = useState("");
  const [chatA, setChatA] = useState<string | null>(null);
  const [chatting, setChatting] = useState(false);

  const refreshDocs = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = await res.json();
    if (res.ok) {
      setDocs(data.documents ?? []);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshDocs();
      if (cancelled) return;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshDocs]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function initDrive() {
    setIniting(true);
    setMessage(null);
    const res = await fetch("/api/drive/init", { method: "POST" });
    const data = await res.json();
    setIniting(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not initialize Drive folders.");
      return;
    }
    setMessage("Drive folders are ready.");
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    setUploadOutcome(null);
    setFolderStepDetail(null);
    setIndexingFollowUp(false);
    setUploadStepUi({ ...INITIAL_UPLOAD_STEPS });

    const fd = new FormData();
    fd.append("file", file);

    let sawResult = false;

    const handleStreamEvent = (ev: UploadStreamEvent) => {
      if (ev.type === "progress") {
        if (ev.phase === "started") {
          setUploadStepUi((prev) => {
            if (!prev) return prev;
            return { ...prev, [ev.step]: "active" };
          });
        } else {
          setUploadStepUi((prev) => {
            if (!prev) return prev;
            return { ...prev, [ev.step]: "done" };
          });
          if (ev.step === "folder" && ev.detail) {
            setFolderStepDetail(ev.detail);
          }
          if (ev.step === "saving" && ev.phase === "completed") {
            setIndexingFollowUp(true);
          }
        }
        return;
      }

      sawResult = true;
      setIndexingFollowUp(false);

      if (ev.ok) {
        let text = `Success: “${file.name}” was saved to Google Drive under “${ev.category}”.`;
        if (ev.partial && ev.warning) {
          text += ` ${ev.warning}`;
        }
        if (ev.detail && ev.partial) {
          text += ` (${ev.detail})`;
        }
        setUploadOutcome({ kind: "success", text });
        input.value = "";
        void refreshDocs();
      } else {
        setUploadStepUi((prev) =>
          prev ? markFirstIncompleteAsError(prev) : prev,
        );
        setUploadOutcome({ kind: "error", text: ev.error });
      }
    };

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: fd,
        signal: AbortSignal.timeout(240_000),
      });

      let data: { events?: unknown; error?: string };
      try {
        data = (await res.json()) as { events?: unknown; error?: string };
      } catch {
        setUploadStepUi((prev) =>
          prev ? markFirstIncompleteAsError(prev) : prev,
        );
        setUploadOutcome({
          kind: "error",
          text: "Server returned invalid JSON.",
        });
        return;
      }

      const replay = Array.isArray(data.events)
        ? (data.events as UploadStreamEvent[])
        : [];
      for (const ev of replay) {
        flushSync(() => {
          handleStreamEvent(ev);
        });
        await new Promise<void>((r) => setTimeout(r, 0));
      }

      if (!res.ok) {
        if (!sawResult) {
          setUploadStepUi((prev) =>
            prev ? markFirstIncompleteAsError(prev) : prev,
          );
          setUploadOutcome({
            kind: "error",
            text:
              typeof data.error === "string"
                ? data.error
                : `Upload failed (${res.status}).`,
          });
        }
        return;
      }

      if (!sawResult) {
        setUploadStepUi((prev) =>
          prev ? markFirstIncompleteAsError(prev) : prev,
        );
        setUploadOutcome({
          kind: "error",
          text: "Upload finished without a final status from the server.",
        });
      }
    } catch (err) {
      setIndexingFollowUp(false);
      setUploadStepUi((prev) =>
        prev ? markFirstIncompleteAsError(prev) : prev,
      );
      setUploadOutcome({
        kind: "error",
        text:
          err instanceof DOMException && err.name === "TimeoutError"
            ? "Upload took too long (4+ minutes) and was stopped. Check Vercel logs and your network."
            : "Upload failed (network or server). Try again.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function askChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatQ.trim()) return;
    setChatting(true);
    setChatA(null);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: chatQ }),
    });
    const data = await res.json();
    setChatting(false);
    if (!res.ok) {
      setChatA(data.error ?? "Chat failed.");
      return;
    }
    setChatA(data.answer);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Your vault</h1>
          <p className="text-sm text-zinc-600">
            Uploads are classified and stored in your Google Drive.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void initDrive()}
            disabled={initing}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            {initing ? "Preparing…" : "Prepare Drive folders"}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </header>

      {message ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          {message}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900">Upload</h2>
        <p className="mt-1 text-sm text-zinc-600">
          PDF and text files are indexed for search. Other types are still stored
          on Drive.
        </p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onUpload}>
          <label className="flex flex-1 flex-col text-sm">
            <span className="text-zinc-700">File</span>
            <input
              name="file"
              type="file"
              required
              className="mt-1 rounded border border-zinc-300 px-2 py-2 text-zinc-900"
            />
          </label>
          <button
            type="submit"
            disabled={uploading}
            className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {uploading ? "Working…" : "Upload"}
          </button>
        </form>

        {uploadStepUi ? (
          <div
            className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50/90 p-4"
            aria-live="polite"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Upload progress
            </p>
            <ol className="mt-3 list-none space-y-3 p-0">
              {(["reading", "folder", "saving"] as const).map((stepId) => {
                const state = uploadStepUi[stepId];
                return (
                  <li key={stepId} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                      {state === "pending" ? (
                        <span className="h-2 w-2 rounded-full bg-zinc-300" title="Pending" />
                      ) : null}
                      {state === "active" ? (
                        <span
                          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
                          aria-hidden
                        />
                      ) : null}
                      {state === "done" ? (
                        <span className="text-base leading-none text-emerald-600" aria-hidden>
                          ✓
                        </span>
                      ) : null}
                      {state === "error" ? (
                        <span className="text-base leading-none text-red-600" aria-hidden>
                          ✕
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={
                        state === "done"
                          ? "font-medium text-zinc-800"
                          : state === "active"
                            ? "font-medium text-zinc-900"
                            : state === "error"
                              ? "font-medium text-red-800"
                              : "text-zinc-500"
                      }
                    >
                      {UPLOAD_STEP_LABELS[stepId]}
                      {stepId === "folder" &&
                      state === "done" &&
                      folderStepDetail ? (
                        <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                          Folder: {folderStepDetail}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>

            {indexingFollowUp ? (
              <p className="mt-3 flex items-center gap-2 border-t border-zinc-200 pt-3 text-xs text-zinc-600">
                <span
                  className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent"
                  aria-hidden
                />
                Indexing for search…
              </p>
            ) : null}

            {uploadOutcome ? (
              <div
                className={
                  uploadOutcome.kind === "success"
                    ? "mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-950"
                    : "mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-950"
                }
                role="status"
              >
                <span className="font-semibold">
                  {uploadOutcome.kind === "success" ? "Success" : "Could not finish"}
                </span>
                <span className="mt-1 block font-normal leading-snug">
                  {uploadOutcome.text}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900">Documents</h2>
        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No documents yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-zinc-900">{d.title}</p>
                  <p className="text-xs text-zinc-500">
                    {d.category} · {new Date(d.created_at).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/api/drive/download/${d.drive_file_id}`}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Download
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900">Ask about your files</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Answers use text extracted from your uploads. This is not medical advice.
        </p>
        <form className="mt-4 flex flex-col gap-3" onSubmit={askChat}>
          <textarea
            value={chatQ}
            onChange={(e) => setChatQ(e.target.value)}
            rows={3}
            placeholder="e.g. What lab values are mentioned in my recent reports?"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
          />
          <button
            type="submit"
            disabled={chatting}
            className="h-10 w-fit rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {chatting ? "Thinking…" : "Ask"}
          </button>
        </form>
        {chatA ? (
          <div className="mt-4 rounded-lg bg-zinc-50 px-3 py-3 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">
            {chatA}
          </div>
        ) : null}
      </section>
    </div>
  );
}
