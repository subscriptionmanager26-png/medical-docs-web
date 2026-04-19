/** Shared client/server shapes for `/api/documents/upload` NDJSON stream. */

export type UploadStepId = "reading" | "folder" | "saving";

export const UPLOAD_STEP_LABELS: Record<UploadStepId, string> = {
  reading: "Reading Document",
  folder: "Finding Correct Folder",
  saving: "Saving to Folder",
};

export type UploadStreamEvent =
  | {
      type: "progress";
      step: UploadStepId;
      phase: "started" | "completed";
      detail?: string;
    }
  | {
      type: "result";
      ok: true;
      documentId: string;
      category: string;
      driveFileId: string;
      partial?: boolean;
      warning?: string;
      detail?: string;
    }
  | { type: "result"; ok: false; error: string };

/** Response `Content-Type` when using NDJSON streaming (not used on Vercel; see upload route). */
export const UPLOAD_STREAM_MEDIA_TYPE = "application/x-ndjson";
