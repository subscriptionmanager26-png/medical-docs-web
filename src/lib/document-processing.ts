import pdfParse from "pdf-parse";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/categories";
import OpenAI from "openai";
import { requireEnv } from "@/lib/env";

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;

/** PDFs shorter than this (after whitespace collapse) are treated as non-indexable text. */
const PDF_MIN_EXTRACTED_CHARS = 80;

export type VectorIndexPrep = {
  /** Text passed to chunking + embeddings. */
  textForChunks: string;
  /** When set, upload should show this to the user (e.g. scan-only PDF). */
  weakIndexWarning?: string;
};

/**
 * Builds the string we chunk and embed. Image-only / scanned PDFs often yield
 * empty or tiny text from pdf-parse; indexing only the file name makes Copilot
 * look "broken". Instead we embed an explicit notice the model can quote.
 */
export function prepareTextForVectorIndexing (
  extractedText: string,
  fileName: string,
  mimeType: string,
): VectorIndexPrep {
  const trimmed = extractedText.trim();
  const collapsedLen = extractedText.replace(/\s+/g, " ").trim().length;
  const isPdf = mimeType === "application/pdf" || mimeType.endsWith("/pdf");
  const minChars = isPdf ? PDF_MIN_EXTRACTED_CHARS : 1;

  if (collapsedLen >= minChars) {
    return { textForChunks: trimmed };
  }

  const weakIndexWarning =
    "Little or no text could be extracted from this PDF (common for scans, screenshots, or photos saved as PDF). " +
    "Only an indexing notice was stored—Copilot cannot read tables or images without OCR. " +
    "Try a text-based PDF, export to .txt, or use a plain text file.";

  const notice =
    `[Indexed content unavailable for "${fileName}"] ` +
    `The PDF parser found no usable text (${collapsedLen} characters after cleanup). ` +
    `Typical causes: scanned pages, image-only PDFs, or complex layouts. MediSage does not run OCR. ` +
    `To ask questions about data, upload a text-based PDF, paste content into a .txt file, or export tables to text.`;

  return {
    textForChunks: notice,
    weakIndexWarning,
  };
}

/** True when chunk text is our synthetic "no extractable text" notice. */
export function isPlaceholderIndexChunk (chunkContent: string): boolean {
  return chunkContent.trimStart().startsWith("[Indexed content unavailable");
}

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
