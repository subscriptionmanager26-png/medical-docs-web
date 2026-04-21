import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncDriveVaultForUser } from "@/lib/user-drive-sync";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const refresh = session?.provider_refresh_token;
  if (session?.user && refresh) {
    await supabase.from("google_credentials").upsert(
      {
        user_id: session.user.id,
        refresh_token: refresh,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    try {
      await syncDriveVaultForUser(supabase, session.user.id, refresh);
    } catch (err) {
      console.error("[auth/callback] Drive vault sync failed", {
        userId: session.user.id,
        err,
      });
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";

  if (isLocal) {
    return NextResponse.redirect(`${origin}${next}`);
  }
  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
