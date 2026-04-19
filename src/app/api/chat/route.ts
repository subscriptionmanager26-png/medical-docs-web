import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { embedTexts } from "@/lib/document-processing";
import { requireEnv } from "@/lib/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
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

  const [queryEmbedding] = await embedTexts([parsed.data.message]);
  const { data: matches, error: matchError } = await supabase.rpc(
    "match_document_chunks",
    {
      query_embedding: queryEmbedding,
      match_count: 10,
    },
  );

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  const contextBlocks = (matches ?? [])
    .map(
      (m: {
        chunk_content: string;
        similarity: number;
        document_id: string;
      }) =>
        `(document ${m.document_id}, relevance ${m.similarity?.toFixed?.(3) ?? "?"})\n${m.chunk_content}`,
    )
    .join("\n\n---\n\n");

  const client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You answer questions using only the provided excerpts from the user's medical documents. If the answer is not contained in the excerpts, say you do not have enough information in the uploaded files. Do not give medical diagnoses or treatment instructions; suggest consulting a clinician for medical decisions.",
      },
      {
        role: "user",
        content: `Context from documents:\n${contextBlocks || "(no indexed text found)"}\n\nQuestion: ${parsed.data.message}`,
      },
    ],
    temperature: 0.3,
  });

  const answer =
    completion.choices[0]?.message?.content?.trim() ??
    "Sorry, I could not generate an answer.";

  return NextResponse.json({ answer });
}
