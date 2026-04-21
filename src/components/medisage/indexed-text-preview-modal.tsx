"use client";

export type IndexedTextPreviewData = {
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

type Props = {
  open: boolean;
  title: string;
  loading: boolean;
  error: string | null;
  data: IndexedTextPreviewData | null;
  onClose: () => void;
};

export function IndexedTextPreviewModal({
  open,
  title,
  loading,
  error,
  data,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 pb-28 backdrop-blur-sm sm:items-center sm:pb-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="indexed-preview-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(85dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#E5E7EB]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[#E5E7EB] px-4 py-3">
          <div className="min-w-0">
            <p
              id="indexed-preview-title"
              className="truncate text-sm font-semibold text-[#1A1A1A]"
            >
              Indexed text
            </p>
            <p className="truncate text-xs text-[#6B7280]">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-2 py-1 text-sm text-[#6B7280] hover:bg-[#FAFAFA]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading chunks from your vault…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : data ? (
            <div className="space-y-3">
              <p className="text-xs text-[#6B7280]">
                <span className="font-semibold text-[#1A1A1A]">
                  {data.summary.totalChunksInDatabase.toLocaleString()}
                </span>{" "}
                chunk
                {data.summary.totalChunksInDatabase === 1 ? "" : "s"} in the database
                {data.summary.previewLimitedToChunks != null ? (
                  <span className="text-[#6B7280]/90">
                    {" "}
                    (showing first {data.summary.previewLimitedToChunks} in this preview)
                  </span>
                ) : null}
                ,{" "}
                <span className="font-semibold text-[#1A1A1A]">
                  {data.summary.totalChars.toLocaleString()}
                </span>{" "}
                characters in the previewed chunks.
                {data.summary.looksLikePlaceholderNotice ? (
                  <span className="mt-1 block text-amber-600">
                    This file is using an “unavailable text” notice—extraction did not
                    produce usable body text for indexing.
                  </span>
                ) : null}
              </p>
              {data.chunks.length === 0 ? (
                <p className="text-sm text-[#6B7280]">
                  No chunks in the database for this document (indexing may have failed).
                </p>
              ) : (
                data.chunks.map((ch) => (
                  <div
                    key={ch.chunkIndex}
                    className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-3"
                  >
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Chunk {ch.chunkIndex}
                      <span className="font-normal normal-case text-[#6B7280]/80">
                        {" "}
                        · {ch.charCount.toLocaleString()} chars
                        {ch.truncated ? " · preview truncated" : ""}
                      </span>
                    </p>
                    <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-[#1A1A1A]">
                      {ch.content}
                    </pre>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
        <p className="border-t border-[#E5E7EB] px-4 py-2 text-[10px] text-[#6B7280]">
          This is exactly what was embedded for vector search (per chunk). Not medical
          advice.
        </p>
      </div>
    </div>
  );
}
