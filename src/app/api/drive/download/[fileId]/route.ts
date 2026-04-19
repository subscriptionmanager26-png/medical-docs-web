import { NextResponse, type NextRequest } from "next/server";
import { Readable as NodeReadable } from "node:stream";
import { createClient } from "@/lib/supabase/server";
import {
  createReadStreamForFile,
  getFileMetadata,
} from "@/lib/google-drive";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ fileId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { fileId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, drive_file_id, title, mime_type")
    .eq("user_id", user.id)
    .eq("drive_file_id", fileId)
    .maybeSingle();

  if (docError || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: cred } = await supabase
    .from("google_credentials")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cred?.refresh_token) {
    return NextResponse.json({ error: "Drive not connected" }, { status: 400 });
  }

  const stream = await createReadStreamForFile(cred.refresh_token, fileId);
  const meta = await getFileMetadata(cred.refresh_token, fileId).catch(
    () => null,
  );
  const filename = meta?.name ?? doc.title ?? "download";
  const mime = meta?.mimeType ?? doc.mime_type ?? "application/octet-stream";

  const webStream = NodeReadable.toWeb(stream as NodeReadable);

  return new Response(webStream as unknown as BodyInit, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
