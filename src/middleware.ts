import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip API routes: running auth refresh + cookie rewriting on every upload
     * can buffer or interfere with streaming bodies (e.g. NDJSON upload progress).
     *
     * Skip static files in /public: Google / Bing / domain verification (e.g. *.html, *.xml),
     * and common well-known paths so they are not processed by auth middleware.
     */
    "/((?!api/|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.html$|.*\\.xml$|.*\\.txt$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt)$|\\.well-known).*)",
  ],
};
