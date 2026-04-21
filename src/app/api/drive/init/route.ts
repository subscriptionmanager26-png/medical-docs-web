import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureDriveStructure, formatGoogleDriveError } from "@/lib/google-drive";

export const runtime = "nodejs";

export async function POST() {
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
          "Google Drive not connected. Sign out and sign in again with Google, granting Drive access.",
      },
      { status: 400 },
    );
  }

  const { data: roots } = await supabase
    .from("drive_roots")
    .select("root_folder_id, category_folder_ids")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const structure = await ensureDriveStructure(cred.refresh_token, roots);

    await supabase.from("drive_roots").upsert(
      {
        user_id: user.id,
        root_folder_id: structure.root_folder_id,
        category_folder_ids: structure.category_folder_ids,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return NextResponse.json({ ok: true, ...structure });
  } catch (err) {
    const message = formatGoogleDriveError(err);
    console.error("[drive/init] failed", { userId: user.id, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
