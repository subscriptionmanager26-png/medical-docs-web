import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public files and SEO / verification: never run Supabase on these so /public/*
  // and root verification files (e.g. Google Search Console) return 200, not 404/edge errors.
  if (
    path.startsWith("/.well-known/") ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/favicon.ico" ||
    path.endsWith(".html") ||
    path.endsWith(".webmanifest")
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isApp = path.startsWith("/app");
  const isAuthCallback = path.startsWith("/auth/callback");

  if (isApp && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (path === "/login" && user && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
