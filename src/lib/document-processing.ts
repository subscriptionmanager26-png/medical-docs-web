import pdfParse from "pdf-parse";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/categories";
import OpenAI from "openai";
import { requireEnv } from "@/lib/env";

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;

export async function extractTextFromBuffer(
  mimeType: string,
  buffer: Buffer,
): Promise<string> {
  if (mimeType === "application/pdf" || mimeType.endsWith("/pdf")) {
    // pdf-parse 1.x avoids pdfjs-dist + @napi-rs/canvas (unreliable on Vercel serverless).
    const data = await pdfParse(buffer);
    return (data.text ?? "").trim();
  }
  if (mimeType.startsWith("text/") || mimeType === "application/json") {
    return buffer.toString("utf8").trim();
  }
  return "";
}

export function chunkText(text: string): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

export async function classifyDocument(textSnippet: string): Promise<DocumentCategory> {
  const client = new OpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
    timeout: 45_000,
    maxRetries: 1,
  });
  const snippet = textSnippet.slice(0, 8000);
  const list = DOCUMENT_CATEGORIES.join(", ");
  const res = await client.chat.completions.create({
    model: process.env.OPENAI_CLASSIFY_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You classify medical document text into exactly one category from: ${list}. Reply with only the category name, nothing else.`,
      },
      { role: "user", content: snippet || "(empty document)" },
    ],
    temperature: 0,
  });
  const raw = res.choices[0]?.message?.content?.trim() ?? "Other";
  const match = DOCUMENT_CATEGORIES.find(
    (c) => c.toLowerCase() === raw.toLowerCase(),
  );
  return match ?? "Other";
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = new OpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
    timeout: 120_000,
    maxRetries: 1,
  });
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const batchSize = 64;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await client.embeddings.create({
      model,
      input: batch,
    });
    const sorted = [...res.data].sort((a, b) => a.index - b.index);
    out.push(...sorted.map((d) => d.embedding as unknown as number[]));
  }
  return out;
}
