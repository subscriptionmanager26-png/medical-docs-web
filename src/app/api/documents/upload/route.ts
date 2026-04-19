import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  chunkText,
  classifyDocument,
  embedTexts,
  extractTextFromBuffer,
} from "@/lib/document-processing";
import { ensureDriveStructure, uploadToDriveFolder } from "@/lib/google-drive";
import type { DocumentCategory } from "@/lib/categories";
import { withTimeout } from "@/lib/with-timeout";
import type { UploadStreamEvent } from "@/lib/upload-stream-protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Increase on Vercel Pro / Fluid if large PDFs + embeddings exceed this. */
export const maxDuration = 120;

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: cred, error: credError } = await supabase
    .from("google_credentials")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (credError || !cred?.refresh_token) {
    return NextResponse.json(
      {
        error:
          "Google Drive not connected. Sign out and sign in again with Google.",
      },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  const events: UploadStreamEvent[] = [];
  const push = (e: UploadStreamEvent) => {
    events.push(e);
  };

  try {
    push({ type: "progress", step: "reading", phase: "started" });

    const { data: roots } = await supabase
      .from("drive_roots")
      .select("root_folder_id, category_folder_ids")
      .eq("user_id", user.id)
      .maybeSingle();

    const [text, structure] = await Promise.all([
      withTimeout(
        extractTextFromBuffer(mimeType, buffer),
        60_000,
        "Text extraction",
      ).catch(() => ""),
      ensureDriveStructure(cred.refresh_token, roots),
    ]);
    push({ type: "progress", step: "reading", phase: "completed" });

    push({ type: "progress", step: "folder", phase: "started" });
    let category: DocumentCategory = "Other";
    try {
      category = await withTimeout(
        classifyDocument(text),
        35_000,
        "Classification",
      );
    } catch {
      category = "Other";
    }

    await supabase.from("drive_roots").upsert(
      {
        user_id: user.id,
        root_folder_id: structure.root_folder_id,
        category_folder_ids: structure.category_folder_ids,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    const folderId = structure.category_folder_ids[category];
    if (!folderId) {
      push({
        type: "result",
        ok: false,
        error: "Could not resolve folder for category",
      });
      return NextResponse.json({ events }, { status: 500 });
    }
    push({
      type: "progress",
      step: "folder",
      phase: "completed",
      detail: category,
    });

    push({ type: "progress", step: "saving", phase: "started" });
    const driveFileId = await withTimeout(
      uploadToDriveFolder({
        refreshToken: cred.refresh_token,
        folderId,
        fileName: file.name,
        mimeType,
        buffer,
      }),
      90_000,
      "Google Drive upload",
    );

    const { data: docRow, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        drive_file_id: driveFileId,
        drive_folder_id: folderId,
        title: file.name,
        mime_type: mimeType,
        category,
      })
      .select("id")
      .single();

    if (docError || !docRow) {
      push({
        type: "result",
        ok: false,
        error: docError?.message ?? "Failed to save document",
      });
      return NextResponse.json({ events }, { status: 500 });
    }

    push({ type: "progress", step: "saving", phase: "completed" });

    const chunks = chunkText(text || file.name);
    let partial = false;
    let warning: string | undefined;
    let detail: string | undefined;

    if (chunks.length > 0) {
      try {
        const embeddings = await withTimeout(
          embedTexts(chunks),
          150_000,
          "Embedding",
        );
        const { error: chunkErr } = await supabase.from("document_chunks").insert(
          chunks.map((content, i) => ({
            document_id: docRow.id,
            user_id: user.id,
            chunk_index: i,
            content,
            embedding: embeddings[i],
          })),
        );

        if (chunkErr) {
          partial = true;
          warning =
            "File is on Google Drive, but search chunks could not be saved.";
          detail = chunkErr.message;
        }
      } catch {
        partial = true;
        warning =
          "File is on Google Drive, but embedding/indexing timed out. You can re-upload or try again later.";
      }
    }

    push({
      type: "result",
      ok: true,
      documentId: docRow.id,
      category,
      driveFileId,
      partial,
      warning,
      detail,
    });

    return NextResponse.json(
      { events },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Upload-Transport": "json-events",
        },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upload failed unexpectedly.";
    push({ type: "result", ok: false, error: message });
    return NextResponse.json({ events }, { status: 500 });
  }
}
