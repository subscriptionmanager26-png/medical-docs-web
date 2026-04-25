import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CasRequestForm } from "./cas-request-form";

export default async function CasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/cas");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-medi-canvas px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-medi-line bg-white p-8 shadow-medi-card sm:p-10">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-medi-accent">
          MediSage · CAS
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-medi-ink">
          CAMS consolidated statement
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-medi-muted">
          Request a CAMS+KFintech consolidated account statement (detailed,
          specific period). You must be authorised to use the CAMS email on
          this form. This tool is for your own records only.
        </p>
        <CasRequestForm />
        <p className="mt-8 text-center text-xs text-medi-muted">
          <Link href="/app" className="underline underline-offset-2 hover:text-medi-ink">
            Back to app
          </Link>
          <span className="mx-2 text-medi-line">·</span>
          <Link href="/" className="underline underline-offset-2 hover:text-medi-ink">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
