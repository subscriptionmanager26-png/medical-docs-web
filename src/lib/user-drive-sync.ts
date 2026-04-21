import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDriveStructure } from "@/lib/google-drive";

/**
 * Ensures the user's MediSage vault folder tree exists in Google Drive and
 * persists folder IDs in `drive_roots`. Safe to call on every OAuth sign-in
 * and before uploads; `ensureDriveStructure` is idempotent and repairs stale IDs.
 */
export async function syncDriveVaultForUser(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string,
): Promise<{
  root_folder_id: string;
  category_folder_ids: Record<string, string>;
}> {
  const { data: roots } = await supabase
    .from("drive_roots")
    .select("root_folder_id, category_folder_ids")
    .eq("user_id", userId)
    .maybeSingle();

  const structure = await ensureDriveStructure(refreshToken, roots);

  const { error } = await supabase.from("drive_roots").upsert(
    {
      user_id: userId,
      root_folder_id: structure.root_folder_id,
      category_folder_ids: structure.category_folder_ids,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  return {
    root_folder_id: structure.root_folder_id,
    category_folder_ids: structure.category_folder_ids,
  };
}
