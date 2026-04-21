"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENT_CATEGORIES } from "@/lib/categories";
import {
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

type TabId = "home" | "vault" | "ask" | "profile";

type Citation = {
  documentId: string;
  title: string;
  driveFileId: string;
};

type ChatMsg =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      citations?: Citation[];
      retrievalNote?: string | null;
    };

type IndexedTextApiResponse = {
  document: {
    id: string;
    title: string;
    category: string;
    mime_type: string | null;
    created_at: string;
  };
  chunks: Array<{
    chunkIndex: number;
    charCount: number;
    truncated: boolean;
    content: string;
  }>;
  summary: {
    totalChunks: number;
    totalChunksInDatabase: number;
    previewLimitedToChunks: number | null;
    totalChars: number;
    looksLikePlaceholderNotice: boolean;
    truncatedChunkCount: number;
  };
};

const INITIAL_UPLOAD_STEPS: Record<UploadStepId, UploadStepUi> = {
  reading: "pending",
  folder: "pending",
  saving: "pending",
};

const PROMPT_CHIPS = [
  "Summarize my latest lab report",
  "List medications mentioned in my files",
  "What dates appear in my recent uploads?",
  "Explain abnormal values in plain language",
];

const LIBRARY_PILLS: { label: string; category: (typeof DOCUMENT_CATEGORIES)[number] }[] =
  [
    { label: "Labs", category: "Lab Reports" },
    { label: "Scans", category: "Imaging" },
    { label: "Scripts", category: "Prescriptions" },
    { label: "Insurance", category: "Insurance" },
    { label: "Visits", category: "Other" },
  ];

const SMART_TAGS = [
  "#Labwork",
  "#Imaging",
  "#Prescriptions",
  "#Insurance",
  "#VisitNotes",
];

function markFirstIncompleteAsError(
  steps: Record<UploadStepId, UploadStepUi>,
): Record<UploadStepId, UploadStepUi> {
  const order: UploadStepId[] = ["reading", "folder", "saving"];
  const next = { ...steps };
  const first = order.find((s) => next[s] !== "done");
  if (first) next[first] = "error";
  return next;
}

function docIcon(mime: string | null) {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("pdf")) return "PDF";
  if (m.includes("image")) return "IMG";
  if (m.includes("text")) return "TXT";
  return "DOC";
}

function NavIconHome({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-medi-accent" : "text-medi-muted"}
      aria-hidden
    >
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavIconVault({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-medi-accent" : "text-medi-muted"}
      aria-hidden
    >
      <rect
        x="4"
        y="6"
        width="16"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function NavIconAsk({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-medi-accent" : "text-medi-muted"}
      aria-hidden
    >
      <path
        d="M12 3a7 7 0 0 1 7 7c0 3.5-2.5 6-5 7.5L12 21l-2-3.5C7.5 16 5 13.5 5 10a7 7 0 0 1 7-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="1.2" fill="currentColor" />
    </svg>
  );
}

function NavIconProfile({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-medi-accent" : "text-medi-muted"}
      aria-hidden
    >
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStepUi, setUploadStepUi] = useState<
    Record<UploadStepId, UploadStepUi> | null
  >(null);
  const [uploadOutcome, setUploadOutcome] = useState<UploadOutcome | null>(null);
  const [, setFolderStepDetail] = useState<string | null>(null);
  const [indexingFollowUp, setIndexingFollowUp] = useState(false);
  const [initing, setIniting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [chatQ, setChatQ] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatting, setChatting] = useState(false);
  const [successHold, setSuccessHold] = useState(false);
  const [vaultCategory, setVaultCategory] = useState<string | null>(null);
  const [indexedPreviewOpen, setIndexedPreviewOpen] = useState(false);
  const [indexedPreviewTitle, setIndexedPreviewTitle] = useState("");
  const [indexedPreviewLoading, setIndexedPreviewLoading] = useState(false);
  const [indexedPreviewData, setIndexedPreviewData] =
    useState<IndexedTextApiResponse | null>(null);
  const [indexedPreviewError, setIndexedPreviewError] = useState<string | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshDocs = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = await res.json();
    if (res.ok) {
      setDocs(data.documents ?? []);
    }
  }, []);

  function closeIndexedPreview () {
    setIndexedPreviewOpen(false);
    setIndexedPreviewTitle("");
    setIndexedPreviewLoading(false);
    setIndexedPreviewData(null);
    setIndexedPreviewError(null);
  }

  async function openIndexedPreview (docId: string, title: string) {
    setIndexedPreviewOpen(true);
    setIndexedPreviewTitle(title);
    setIndexedPreviewLoading(true);
    setIndexedPreviewData(null);
    setIndexedPreviewError(null);
    try {
      const res = await fetch(`/api/documents/${docId}/indexed-text`);
      const data = (await res.json()) as IndexedTextApiResponse & { error?: string };
      if (!res.ok) {
        setIndexedPreviewError(data.error ?? `Could not load (HTTP ${res.status})`);
        return;
      }
      setIndexedPreviewData(data);
    } catch {
      setIndexedPreviewError("Network error while loading indexed text.");
    } finally {
      setIndexedPreviewLoading(false);
    }
  }

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

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserLabel(u.email ?? "You");
      const url = u.user_metadata?.avatar_url;
      setAvatarUrl(typeof url === "string" ? url : null);
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatting, activeTab]);

  useEffect(() => {
    // `window.setTimeout` returns `number` in DOM types; Node's `setTimeout` is `Timeout` — use DOM handle for Next/Vercel build.
    let t0: number | undefined;
    let t1: number | undefined;
    if (uploadOutcome?.kind === "success" && !uploading) {
      t0 = window.setTimeout(() => setSuccessHold(true), 0);
      t1 = window.setTimeout(() => setSuccessHold(false), 2600);
    } else {
      t0 = window.setTimeout(() => setSuccessHold(false), 0);
    }
    return () => {
      if (t0 !== undefined) window.clearTimeout(t0);
      if (t1 !== undefined) window.clearTimeout(t1);
    };
  }, [uploadOutcome, uploading]);

  const overlayOpen = uploading || successHold;

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

  const processUploadResponse = useCallback(
    async (res: Response, file: HTMLInputElement | null, fileName: string) => {
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
          let text = `Success: “${fileName}” was saved to Google Drive under “${ev.category}”.`;
          if (ev.partial && ev.warning) {
            text += ` ${ev.warning}`;
          }
          if (ev.detail && ev.partial) {
            text += ` (${ev.detail})`;
          }
          setUploadOutcome({ kind: "success", text });
          if (file) file.value = "";
          void refreshDocs();
        } else {
          setUploadStepUi((prev) =>
            prev ? markFirstIncompleteAsError(prev) : prev,
          );
          setUploadOutcome({ kind: "error", text: ev.error });
        }
      };

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
    },
    [refreshDocs],
  );

  async function uploadFile(file: File, inputEl: HTMLInputElement | null) {
    setUploading(true);
    setMessage(null);
    setUploadOutcome(null);
    setFolderStepDetail(null);
    setIndexingFollowUp(false);
    setUploadStepUi({ ...INITIAL_UPLOAD_STEPS });

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: fd,
        signal: AbortSignal.timeout(240_000),
      });
      await processUploadResponse(res, inputEl, file.name);
    } catch (err) {
      setIndexingFollowUp(false);
      setUploadStepUi((prev) =>
        prev ? markFirstIncompleteAsError(prev) : prev,
      );
      setUploadOutcome({
        kind: "error",
        text:
          err instanceof DOMException && err.name === "TimeoutError"
            ? "Upload took too long (4+ minutes) and was stopped."
            : "Upload failed (network or server). Try again.",
      });
    } finally {
      setUploading(false);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function onHiddenFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file, e.target);
  }

  async function submitChat() {
    const q = chatQ.trim();
    if (!q || chatting) return;
    setChatQ("");
    setChatMessages((m) => [...m, { role: "user", content: q }]);
    setChatting(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: q }),
    });
    const data = (await res.json()) as {
      answer?: string;
      error?: string;
      retrieval?: {
        chunkCount?: number;
        maxSimilarity?: number | null;
        weakExcerpts?: boolean;
      };
      citations?: Citation[];
    };
    setChatting(false);
    if (!res.ok) {
      setChatMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.error ?? "Chat failed.",
          retrievalNote: null,
        },
      ]);
      return;
    }
    const answer = data.answer ?? "No answer returned.";
    const n = data.retrieval?.chunkCount;
    const sim = data.retrieval?.maxSimilarity;
    let retrievalNote: string | null = null;
    if (typeof n === "number" && n > 0 && typeof sim === "number") {
      retrievalNote = `Used ${n} snippet${n === 1 ? "" : "s"} from your vault (best match ${sim.toFixed(3)}).`;
      if (data.retrieval?.weakExcerpts) {
        retrievalNote +=
          " Some matches are “no extractable text” notices (common for scan/photo PDFs)—re-upload as text or export to .txt for full answers.";
      }
    } else if (typeof n === "number" && n === 0) {
      retrievalNote = "No indexed passages were found for your account.";
    }
    setChatMessages((m) => [
      ...m,
      {
        role: "assistant",
        content: answer,
        citations: Array.isArray(data.citations) ? data.citations : [],
        retrievalNote,
      },
    ]);
  }

  async function askChat(e: React.FormEvent) {
    e.preventDefault();
    await submitChat();
  }

  function uploadOverlayPhase(): "upload" | "analyze" | "structure" | "done" | "error" {
    if (uploadOutcome?.kind === "error") return "error";
    if (successHold && uploadOutcome?.kind === "success") return "done";
    if (indexingFollowUp) return "structure";
    const s = uploadStepUi;
    if (!s) return "upload";
    if (s.reading === "active") return "upload";
    if (s.folder === "active" || (s.reading === "done" && s.folder !== "done"))
      return "analyze";
    if (
      s.saving === "active" ||
      (s.saving === "pending" && s.folder === "done")
    )
      return "structure";
    if (
      s.reading === "pending" &&
      s.folder === "pending" &&
      s.saving === "pending"
    )
      return "upload";
    return "structure";
  }

  const phase = overlayOpen ? uploadOverlayPhase() : "upload";
  const recentDocs = [...docs]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 6);

  const healthLine =
    docs.length === 0
      ? "Add a document"
      : docs.length < 3
        ? "Building profile"
        : "All clear";

  const healthSub =
    docs.length === 0
      ? "Upload labs or visit notes to unlock insights."
      : "Your vault has indexed material ready for Copilot.";

  return (
    <div className="min-h-dvh bg-medi-canvas md:flex md:justify-center md:py-10 md:px-4">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[100vw] flex-col overflow-hidden bg-white shadow-medi-float md:min-h-[720px] md:max-w-[400px] md:rounded-3xl md:border md:border-medi-line md:shadow-medi-card">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,text/plain,application/pdf"
          onChange={(e) => void onHiddenFileChange(e)}
        />

        {overlayOpen ? (
          <div
            className={
              phase === "done"
                ? "absolute inset-0 z-50 flex flex-col items-center justify-center bg-emerald-500/95 p-8 text-center text-white backdrop-blur-xl transition-colors duration-500"
                : phase === "error"
                  ? "absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 p-8 text-center text-white backdrop-blur-xl"
                  : "absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/75 p-8 text-center text-white backdrop-blur-xl"
            }
            role="status"
            aria-live="polite"
          >
            {phase === "done" ? (
              <div className="animate-medi-success-pop text-6xl text-medi-success" aria-hidden>
                ✓
              </div>
            ) : phase === "error" ? (
              <div className="text-5xl" aria-hidden>
                ✕
              </div>
            ) : (
              <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-medi-accent/25 blur-xl" />
                {phase === "upload" ? (
                  <span className="text-4xl" aria-hidden>
                    ☁️
                  </span>
                ) : phase === "analyze" ? (
                  <span className="text-4xl" aria-hidden>
                    🧠
                  </span>
                ) : (
                  <span className="text-4xl" aria-hidden>
                    📁
                  </span>
                )}
                <span className="absolute inset-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              </div>
            )}
            <p className="mt-4 text-lg font-semibold tracking-tight">
              {phase === "done"
                ? "Document indexed"
                : phase === "error"
                  ? "Something went wrong"
                  : phase === "upload"
                    ? "Uploading securely"
                    : phase === "analyze"
                      ? "Copilot is analyzing"
                      : "Structuring data"}
            </p>
            <p className="mt-2 max-w-[260px] text-sm text-white/80">
              {phase === "done"
                ? uploadOutcome?.kind === "success"
                  ? uploadOutcome.text
                  : ""
                : phase === "error"
                  ? uploadOutcome?.kind === "error"
                    ? uploadOutcome.text
                    : ""
                  : phase === "upload"
                    ? "Your file is encrypted in transit and processed privately."
                    : phase === "analyze"
                      ? "Extracting entities and medical context from your document."
                      : "Routing to the right folder and indexing for search."}
            </p>
          </div>
        ) : null}

        <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between gap-3 border-b border-medi-line bg-white/95 px-4 py-3 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-medi-accent p-[2px] shadow-sm"
              aria-hidden
            >
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-medi-accent">
                    {(userLabel || "M").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-medi-ink">
                MediSage
              </p>
              <p className="truncate text-xs text-medi-muted">
                {userLabel || "Your health copilot"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-medi-accent/25 bg-medi-accent/10 px-2.5 py-1 text-[10px] font-medium tracking-tight text-medi-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-medi-accent/50 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-medi-accent" />
            </span>
            Copilot active
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-white px-4 pb-28 pt-4 tracking-tight">
          {activeTab === "home" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("ask")}
                  className="relative col-span-2 overflow-hidden rounded-3xl bg-medi-ink p-5 text-left text-white shadow-medi-float ring-1 ring-medi-line transition active:scale-[0.99]"
                >
                  <span className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-medi-accent/35 blur-2xl" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-medi-accent">
                    Ask your data
                  </p>
                  <p className="mt-2 text-xl font-semibold leading-snug">
                    MediSage Copilot
                  </p>
                  <p className="mt-2 text-sm text-white/75">
                    Search across labs, scans, and notes—instant answers with
                    citations.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-medi-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-medi-accent-hover">
                    Open chat
                    <span aria-hidden>→</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openFilePicker}
                  className="flex aspect-square flex-col justify-between rounded-3xl border border-medi-line bg-white p-4 text-left shadow-medi-card transition hover:border-medi-accent/30 active:scale-[0.98]"
                >
                  <span className="text-2xl" aria-hidden>
                    ⬆️
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-medi-ink">Upload</p>
                    <p className="mt-1 text-xs text-medi-muted">PDF or text</p>
                  </div>
                </button>

                <div className="flex aspect-square flex-col justify-between rounded-3xl border border-medi-line bg-medi-canvas p-4 shadow-medi-card">
                  <span className="text-2xl" aria-hidden>
                    ✨
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-medi-ink">
                      {healthLine}
                    </p>
                    <p className="mt-1 text-xs text-medi-muted">{healthSub}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-medi-muted">
                  Library
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {LIBRARY_PILLS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setVaultCategory(p.category);
                        setActiveTab("vault");
                      }}
                      className="shrink-0 rounded-full bg-medi-accent/10 px-4 py-2 text-xs font-semibold text-medi-ink ring-1 ring-medi-accent/20 transition hover:bg-medi-accent/15"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-medi-muted">
                  Recent activity
                </p>
                {loading ? (
                  <p className="text-sm text-medi-muted">Loading…</p>
                ) : recentDocs.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-medi-line bg-medi-canvas px-4 py-6 text-center text-sm text-medi-muted">
                    No documents yet. Tap Upload to add your first file.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {recentDocs.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-3 rounded-2xl border border-medi-line bg-white px-3 py-3 shadow-medi-card"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-medi-ink text-[10px] font-bold text-white">
                          {docIcon(d.mime_type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-medi-ink">
                            {d.title}
                          </p>
                          <p className="text-xs text-medi-muted">
                            {new Date(d.created_at).toLocaleDateString()} ·{" "}
                            <span className="text-medi-accent">{d.category}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => void openIndexedPreview(d.id, d.title)}
                            className="text-xs font-semibold text-medi-muted hover:text-medi-accent"
                          >
                            Indexed text
                          </button>
                          <Link
                            href={`/api/drive/download/${d.drive_file_id}`}
                            className="text-xs font-semibold text-medi-accent hover:underline"
                          >
                            Open file
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          ) : null}

          {activeTab === "vault" ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-medi-ink">Data vault</h2>
                <p className="mt-1 text-sm text-medi-muted">
                  Organized copies in your Drive, searchable here.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {DOCUMENT_CATEGORIES.map((cat) => {
                  const count = docs.filter((d) => d.category === cat).length;
                  const active = vaultCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setVaultCategory((c) => (c === cat ? null : cat))
                      }
                      className={
                        active
                          ? "rounded-3xl border-2 border-medi-accent bg-medi-accent/5 p-4 text-left shadow-medi-card"
                          : "rounded-3xl border border-medi-line bg-white p-4 text-left shadow-medi-card"
                      }
                    >
                      <p className="text-xs font-medium text-medi-muted">{cat}</p>
                      <p className="mt-2 text-3xl font-semibold tabular-nums text-medi-ink">
                        {count}
                      </p>
                      <p className="mt-1 text-[11px] text-medi-muted">documents</p>
                    </button>
                  );
                })}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-medi-muted">
                  Smart tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {SMART_TAGS.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-medi-canvas px-3 py-1.5 text-xs font-medium text-medi-ink ring-1 ring-medi-line"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-medi-muted">
                    {vaultCategory ? `${vaultCategory}` : "All documents"}
                  </p>
                  {vaultCategory ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-medi-accent"
                      onClick={() => setVaultCategory(null)}
                    >
                      Clear filter
                    </button>
                  ) : null}
                </div>
                {loading ? (
                  <p className="text-sm text-medi-muted">Loading…</p>
                ) : (
                  <ul className="space-y-2">
                    {docs
                      .filter((d) =>
                        vaultCategory ? d.category === vaultCategory : true,
                      )
                      .map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-medi-line bg-white px-3 py-3 shadow-medi-card"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-medi-ink">
                              {d.title}
                            </p>
                            <p className="text-xs text-medi-muted">
                              {d.category} ·{" "}
                              {new Date(d.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => void openIndexedPreview(d.id, d.title)}
                              className="text-xs font-semibold text-medi-muted hover:text-medi-accent"
                            >
                              Indexed text
                            </button>
                            <Link
                              href={`/api/drive/download/${d.drive_file_id}`}
                              className="text-xs font-semibold text-medi-accent hover:underline"
                            >
                              Download
                            </Link>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "ask" ? (
            <div className="flex min-h-[calc(100dvh-220px)] flex-col">
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-medi-line bg-medi-canvas px-3 py-2.5 shadow-medi-card">
                <div>
                  <p className="text-sm font-semibold text-medi-ink">
                    MediSage Copilot
                  </p>
                  <p className="text-xs text-medi-muted">Answers from your uploads only</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-medi-success/15 px-2 py-1 text-[10px] font-semibold text-medi-success ring-1 ring-medi-success/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-medi-success" />
                  Online
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {chatMessages.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-medi-line bg-medi-canvas px-4 py-6 text-center text-sm text-medi-muted">
                    Ask anything about the text we indexed from your documents.
                    Not medical advice.
                  </p>
                ) : (
                  chatMessages.map((msg, i) =>
                    msg.role === "user" ? (
                      <div
                        key={i}
                        className="ml-6 rounded-2xl bg-medi-ink px-4 py-3 text-sm leading-relaxed text-white shadow-md"
                      >
                        {msg.content}
                      </div>
                    ) : (
                      <div
                        key={i}
                        className="mr-4 rounded-2xl border border-medi-line bg-white px-4 py-3 text-sm leading-relaxed text-medi-ink shadow-medi-card"
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.citations && msg.citations.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                            {msg.citations.map((c) => (
                              <span
                                key={c.documentId}
                                className="inline-flex max-w-full flex-wrap items-center gap-1"
                              >
                                <Link
                                  href={`/api/drive/download/${c.driveFileId}`}
                                  className="inline-flex max-w-[200px] items-center rounded-full bg-medi-accent/10 px-3 py-1 text-xs font-semibold text-medi-accent ring-1 ring-medi-accent/25 hover:bg-medi-accent/15"
                                >
                                  <span className="truncate">{c.title}</span>
                                </Link>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void openIndexedPreview(c.documentId, c.title)
                                  }
                                  className="rounded-full bg-medi-canvas px-2 py-1 text-[10px] font-semibold text-medi-ink ring-1 ring-medi-line hover:bg-medi-line/50"
                                >
                                  Indexed
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {msg.retrievalNote ? (
                          <p className="mt-2 text-[11px] text-medi-muted">
                            {msg.retrievalNote}
                          </p>
                        ) : null}
                      </div>
                    ),
                  )
                )}
                {chatting ? (
                  <div className="mr-4 inline-flex items-center gap-2 rounded-2xl border border-medi-line bg-white px-3 py-2 text-xs text-medi-muted">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-medi-accent border-t-transparent" />
                    Thinking…
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>

              <div className="sticky bottom-0 mt-4 space-y-2 bg-gradient-to-t from-white via-white to-transparent pb-1 pt-3">
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PROMPT_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={chatting}
                      onClick={() => setChatQ(chip)}
                      className="shrink-0 rounded-full border border-medi-accent/25 bg-white px-3 py-1.5 text-[11px] font-medium text-medi-ink shadow-sm transition hover:border-medi-accent/40 disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => void askChat(e)}
                  className="flex items-end gap-2 rounded-full border border-medi-line bg-white px-3 py-2 shadow-medi-float ring-1 ring-medi-accent/10 backdrop-blur-md"
                >
                  <textarea
                    value={chatQ}
                    onChange={(e) => setChatQ(e.target.value)}
                    rows={1}
                    placeholder="Ask about your documents…"
                    className="max-h-28 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-medi-ink outline-none placeholder:text-medi-muted"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void submitChat();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={chatting || !chatQ.trim()}
                    className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-medi-accent text-lg font-semibold text-white shadow-lg shadow-medi-accent/30 transition hover:bg-medi-accent-hover active:scale-[0.98] disabled:opacity-40"
                    aria-label="Send"
                  >
                    ↑
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {activeTab === "profile" ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-medi-line bg-medi-canvas p-5 shadow-medi-card">
                <p className="text-sm font-semibold text-medi-ink">Account</p>
                <p className="mt-1 text-sm text-medi-muted">{userLabel || "—"}</p>
              </div>
              {message ? (
                <p className="rounded-2xl border border-medi-accent/25 bg-medi-accent/10 px-4 py-3 text-sm text-medi-ink">
                  {message}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void initDrive()}
                disabled={initing}
                className="w-full rounded-2xl border border-medi-line bg-white px-4 py-3 text-left text-sm font-semibold text-medi-ink shadow-medi-card transition hover:bg-medi-canvas disabled:opacity-50"
              >
                {initing ? "Preparing Drive…" : "Prepare Drive folders"}
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full rounded-2xl bg-medi-ink px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
              >
                Sign out
              </button>
              <p className="text-center text-[11px] text-medi-muted">
                MediSage does not replace a clinician. AI answers may be incomplete.
              </p>
            </div>
          ) : null}
        </main>

        {indexedPreviewOpen ? (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 pb-28 backdrop-blur-sm md:items-center md:pb-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="indexed-preview-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeIndexedPreview();
            }}
          >
            <div
              className="flex max-h-[min(85dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-medi-float ring-1 ring-medi-line"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2 border-b border-medi-line px-4 py-3">
                <div className="min-w-0">
                  <p
                    id="indexed-preview-title"
                    className="truncate text-sm font-semibold text-medi-ink"
                  >
                    Indexed text
                  </p>
                  <p className="truncate text-xs text-medi-muted">{indexedPreviewTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={closeIndexedPreview}
                  className="shrink-0 rounded-full px-2 py-1 text-sm text-medi-muted hover:bg-medi-canvas"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {indexedPreviewLoading ? (
                  <p className="text-sm text-medi-muted">Loading chunks from your vault…</p>
                ) : indexedPreviewError ? (
                  <p className="text-sm text-medi-danger">{indexedPreviewError}</p>
                ) : indexedPreviewData ? (
                  <div className="space-y-3">
                    <p className="text-xs text-medi-muted">
                      <span className="font-semibold text-medi-ink">
                        {indexedPreviewData.summary.totalChunksInDatabase.toLocaleString()}
                      </span>{" "}
                      chunk
                      {indexedPreviewData.summary.totalChunksInDatabase === 1
                        ? ""
                        : "s"}{" "}
                      in the database
                      {indexedPreviewData.summary.previewLimitedToChunks != null ? (
                        <span className="text-medi-muted/90">
                          {" "}
                          (showing first{" "}
                          {indexedPreviewData.summary.previewLimitedToChunks} in this
                          preview)
                        </span>
                      ) : null}
                      ,{" "}
                      <span className="font-semibold text-medi-ink">
                        {indexedPreviewData.summary.totalChars.toLocaleString()}
                      </span>{" "}
                      characters in the previewed chunks.
                      {indexedPreviewData.summary.looksLikePlaceholderNotice ? (
                        <span className="mt-1 block text-medi-warning">
                          This file is using an “unavailable text” notice—extraction
                          did not produce usable body text for indexing.
                        </span>
                      ) : null}
                    </p>
                    {indexedPreviewData.chunks.length === 0 ? (
                      <p className="text-sm text-medi-muted">
                        No chunks in the database for this document (indexing may have
                        failed).
                      </p>
                    ) : (
                      indexedPreviewData.chunks.map((ch) => (
                        <div
                          key={ch.chunkIndex}
                          className="rounded-2xl border border-medi-line bg-medi-canvas p-3"
                        >
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-medi-muted">
                            Chunk {ch.chunkIndex}
                            <span className="font-normal normal-case text-medi-muted/80">
                              {" "}
                              · {ch.charCount.toLocaleString()} chars
                              {ch.truncated ? " · preview truncated" : ""}
                            </span>
                          </p>
                          <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-medi-ink">
                            {ch.content}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
              <p className="border-t border-medi-line px-4 py-2 text-[10px] text-medi-muted">
                This is exactly what was embedded for vector search (per chunk). Not
                medical advice.
              </p>
            </div>
          </div>
        ) : null}

        <nav
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 md:left-1/2 md:right-auto md:w-[400px] md:-translate-x-1/2"
          aria-label="Primary"
        >
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-medi-line bg-white px-4 py-2 shadow-medi-float backdrop-blur-xl">
            {(
              [
                { id: "home" as const, Icon: NavIconHome },
                { id: "vault" as const, Icon: NavIconVault },
                { id: "ask" as const, Icon: NavIconAsk },
                { id: "profile" as const, Icon: NavIconProfile },
              ] as const
            ).map(({ id, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={
                    active
                      ? "relative flex h-11 w-11 items-center justify-center rounded-full bg-medi-accent/10 transition"
                      : "relative flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-medi-canvas"
                  }
                  aria-label={id}
                >
                  <Icon active={active} />
                  {active ? (
                    <span className="absolute bottom-1.5 h-1 w-3 rounded-full bg-medi-accent" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
