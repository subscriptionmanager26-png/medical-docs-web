"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  Droplets,
  FileStack,
  FileText,
  Pill,
  ScanFace,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENT_CATEGORIES } from "@/lib/categories";
import {
  type UploadStepId,
  type UploadStreamEvent,
} from "@/lib/upload-stream-protocol";
import type { IndexedTextPreviewData } from "@/components/medisage/indexed-text-preview-modal";

export type Doc = {
  id: string;
  title: string;
  category: string;
  mime_type: string | null;
  drive_file_id: string;
  created_at: string;
};

type Citation = {
  documentId: string;
  title: string;
  driveFileId: string;
};

export type ChatMsg =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      citations?: Citation[];
      retrievalNote?: string | null;
    };

export type ChatThread = {
  id: string;
  title: string;
  updated: string;
  messages: ChatMsg[];
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

function categoryIcon(category: string): LucideIcon {
  if (category === "Lab Reports") return Droplets;
  if (category === "Imaging") return ScanFace;
  if (category === "Prescriptions") return Pill;
  if (category === "Insurance") return FileStack;
  return FileText;
}

function formatDocDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export type VaultDisplayFile = {
  id: string;
  title: string;
  date: string;
  folder: string;
  Icon: LucideIcon;
};

export type ProtoTab = "home" | "vault" | "vitals" | "chat" | "services";

function greetingFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const first = local.split(/[._-]/)[0] ?? local;
  if (!first) return "there";
  return first.slice(0, 1).toUpperCase() + first.slice(1);
}

export function useMedisagePrototypeLogic() {
  const [activeTab, setActiveTab] = useState<ProtoTab>("home");
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
  const [chatInput, setChatInput] = useState("");
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatting, setChatting] = useState(false);
  const [successHold, setSuccessHold] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [indexedPreviewOpen, setIndexedPreviewOpen] = useState(false);
  const [indexedPreviewTitle, setIndexedPreviewTitle] = useState("");
  const [indexedPreviewLoading, setIndexedPreviewLoading] = useState(false);
  const [indexedPreviewData, setIndexedPreviewData] =
    useState<IndexedTextPreviewData | null>(null);
  const [indexedPreviewError, setIndexedPreviewError] = useState<string | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeChatId, chatting, activeTab]);

  const refreshDocs = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = (await res.json()) as { documents?: Doc[]; error?: string };
    if (res.ok) {
      setDocs(data.documents ?? []);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshDocs();
      if (!cancelled) setLoading(false);
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

  const vaultFiles: VaultDisplayFile[] = docs.map((d) => ({
    id: d.id,
    title: d.title,
    date: formatDocDate(d.created_at),
    folder: d.category,
    Icon: categoryIcon(d.category),
  }));

  const categoriesForVault = DOCUMENT_CATEGORIES.map((name) => ({
    name,
    Icon: categoryIcon(name),
    count: docs.filter((d) => d.category === name).length,
  }));

  function closeIndexedPreview() {
    setIndexedPreviewOpen(false);
    setIndexedPreviewTitle("");
    setIndexedPreviewLoading(false);
    setIndexedPreviewData(null);
    setIndexedPreviewError(null);
  }

  async function openIndexedPreview(docId: string, title: string) {
    setIndexedPreviewOpen(true);
    setIndexedPreviewTitle(title);
    setIndexedPreviewLoading(true);
    setIndexedPreviewData(null);
    setIndexedPreviewError(null);
    try {
      const res = await fetch(`/api/documents/${docId}/indexed-text`);
      const data = (await res.json()) as IndexedTextPreviewData & {
        error?: string;
      };
      if (!res.ok) {
        setIndexedPreviewError(
          data.error ?? `Could not load (HTTP ${res.status})`,
        );
        return;
      }
      setIndexedPreviewData(data);
    } catch {
      setIndexedPreviewError("Network error while loading indexed text.");
    } finally {
      setIndexedPreviewLoading(false);
    }
  }

  function navToTab(next: ProtoTab) {
    if (next === "chat") setActiveChatId(null);
    if (next === "vault") setActiveFolder(null);
    setActiveTab(next);
  }

  function createNewChat() {
    const id = `${Date.now()}`;
    setChats((c) => [
      { id, title: "New conversation", updated: "Just now", messages: [] },
      ...c,
    ]);
    setActiveChatId(id);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function initDrive() {
    setIniting(true);
    setMessage(null);
    const res = await fetch("/api/drive/init", { method: "POST" });
    const data = (await res.json()) as { error?: string };
    setIniting(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not sync Drive vault folders.");
      return;
    }
    setMessage("Drive vault folders are up to date.");
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
    const q = chatInput.trim();
    if (!q || chatting || !activeChatId) return;
    const chatId = activeChatId;
    setChatInput("");
    setChats((cs) =>
      cs.map((c) => {
        if (c.id !== chatId) return c;
        const nextTitle =
          c.title === "New conversation"
            ? `${q.slice(0, 38)}${q.length > 38 ? "…" : ""}`
            : c.title;
        return {
          ...c,
          title: nextTitle,
          updated: "Just now",
          messages: [...c.messages, { role: "user", content: q }],
        };
      }),
    );
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
      setChats((cs) =>
        cs.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    role: "assistant",
                    content: data.error ?? "Chat failed.",
                    retrievalNote: null,
                  } as ChatMsg,
                ],
              }
            : c,
        ),
      );
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
    const assistantMsg: ChatMsg = {
      role: "assistant",
      content: answer,
      citations: Array.isArray(data.citations) ? data.citations : [],
      retrievalNote,
    };
    setChats((cs) =>
      cs.map((c) =>
        c.id === chatId
          ? { ...c, updated: "Just now", messages: [...c.messages, assistantMsg] }
          : c,
      ),
    );
  }

  const overlayOpen = uploading || successHold;

  function uploadOverlayPhase():
    | "upload"
    | "analyze"
    | "structure"
    | "done"
    | "error" {
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

  const uploadPhase = overlayOpen ? uploadOverlayPhase() : "upload";

  const greetingName = userLabel ? greetingFromEmail(userLabel) : "there";

  return {
    activeTab,
    setActiveTab,
    navToTab,
    docs,
    loading,
    vaultFiles,
    categoriesForVault,
    refreshDocs,
    fileInputRef,
    openFilePicker,
    onHiddenFileChange,
    uploading,
    overlayOpen,
    uploadPhase,
    uploadOutcome,
    userLabel,
    avatarUrl,
    greetingName,
    chatInput,
    setChatInput,
    chats,
    activeChatId,
    setActiveChatId,
    chatting,
    createNewChat,
    submitChat,
    activeFolder,
    setActiveFolder,
    signOut,
    initDrive,
    initing,
    message,
    setMessage,
    indexedPreviewOpen,
    indexedPreviewTitle,
    indexedPreviewLoading,
    indexedPreviewError,
    indexedPreviewData,
    closeIndexedPreview,
    openIndexedPreview,
    chatEndRef,
  };
}
