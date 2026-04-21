import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatGoogleDriveError } from "@/lib/google-drive";
import { syncDriveVaultForUser } from "@/lib/user-drive-sync";

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

  try {
    const structure = await syncDriveVaultForUser(
      supabase,
      user.id,
      cred.refresh_token,
    );
    return NextResponse.json({ ok: true, ...structure });
  } catch (err) {
    const message = formatGoogleDriveError(err);
    console.error("[drive/init] failed", { userId: user.id, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
