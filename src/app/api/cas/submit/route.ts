import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { submitCamsCasViaHttp } from "@/lib/cams/http-submit";

export const runtime = "nodejs";
/** reCAPTCHA + CAMS round-trips can exceed default 10s on serverless. */
export const maxDuration = 120;

const bodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
  pan: z.string().max(20).optional().default(""),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, password, pan, fromDate, toDate } = parsed.data;

  try {
    const { cams, datesSent } = await submitCamsCasViaHttp({
      email,
      password,
      pan,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });

    const status = cams.status as
      | { errorflag?: boolean; errormsg?: string }
      | undefined;

    return NextResponse.json({
      ok: !(status?.errorflag ?? false),
      status,
      detail: cams.detail ?? null,
      detail1: cams.detail1 ?? null,
      /** Echo of `from_date` / `to_date` sent to CAMS (DD-Mon-YYYY in Asia/Kolkata). */
      datesSent,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "CAS submit failed";
    console.error("[cas/submit]", { userId: user.id, message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
