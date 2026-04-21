import pdfParse from "pdf-parse";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/categories";
import OpenAI from "openai";
import { requireEnv } from "@/lib/env";

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;

/** Model for Responses API file/image extraction (must support `input_file` PDFs when applicable). */
const DOCUMENT_PARSE_MODEL =
  process.env.OPENAI_DOCUMENT_PARSE_MODEL ?? "gpt-4o-mini";

const OPENAI_PARSE_DISABLED =
  process.env.OPENAI_DOCUMENT_PARSE_DISABLED === "1" ||
  process.env.OPENAI_DOCUMENT_PARSE_DISABLED === "true";

/** Model must output this alone when nothing is readable (easier to detect than free-form). */
const OPENAI_EXTRACTION_EMPTY_MARKER = "NO_READABLE_CONTENT";

function safeFileNameForOpenAI (name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "document";
  const cleaned = base.replace(/[^a-zA-Z0-9._\- ()]+/g, "_").trim();
  return cleaned.slice(0, 180) || "document.bin";
}

function resolvedMimeForParsing (
  mimeType: string,
  fileName: string,
): string {
  const m = (mimeType || "").toLowerCase().trim();
  if (m && m !== "application/octet-stream") return mimeType;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return mimeType || "application/octet-stream";
}

function shouldParseWithOpenAIResponses (
  mimeType: string,
  fileName: string,
): boolean {
  if (OPENAI_PARSE_DISABLED) return false;
  const m = resolvedMimeForParsing(mimeType, fileName).toLowerCase();
  if (m === "application/pdf" || m.endsWith("/pdf")) return true;
  if (
    m === "image/jpeg" ||
    m === "image/jpg" ||
    m === "image/png" ||
    m === "image/webp" ||
    m === "image/gif"
  ) {
    return true;
  }
  return false;
}

function openAIExtractionPrompt (): string {
  return (
    "Read the attached file and extract all readable text for a personal document search index.\n\n" +
    "Rules:\n" +
    "- Output plain UTF-8 text only. Preserve numbers, dates, units, names, lab values, and table-like rows using newlines/spaces.\n" +
    "- Do not use markdown code fences. Do not add preamble or commentary.\n" +
    `- If there is no readable text, output exactly this single line: ${OPENAI_EXTRACTION_EMPTY_MARKER}`
  );
}

function textFromOpenAIResponse (resp: {
  output_text?: string | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}): string {
  const direct = resp.output_text?.trim();
  if (direct) return direct;
  for (const item of resp.output ?? []) {
    if (item.type === "message" && Array.isArray(item.content)) {
      const texts = item.content
        .filter(
          (c): c is { type: "output_text"; text: string } =>
            c.type === "output_text" && typeof c.text === "string",
        )
        .map((c) => c.text);
      if (texts.length > 0) return texts.join("\n\n").trim();
    }
  }
  return "";
}

async function extractTextWithOpenAIResponses (
  mimeType: string,
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const client = new OpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
    timeout: 180_000,
    maxRetries: 0,
  });
  const resolvedMime = resolvedMimeForParsing(mimeType, fileName);
  const b64 = buffer.toString("base64");
  const safeName = safeFileNameForOpenAI(fileName);

  const isImage = resolvedMime.startsWith("image/");
  const pdfFilename = /\.pdf$/i.test(safeName) ? safeName : `${safeName}.pdf`;
  const userContent: Array<
    | { type: "input_file"; filename: string; file_data: string }
    | { type: "input_image"; image_url: string; detail: "auto" | "high" }
    | { type: "input_text"; text: string }
  > = isImage
    ? [
        {
          type: "input_image",
          image_url: `data:${resolvedMime};base64,${b64}`,
          detail: "high",
        },
        { type: "input_text", text: openAIExtractionPrompt() },
      ]
    : [
        {
          type: "input_file",
          filename: pdfFilename,
          file_data: `data:${resolvedMime};base64,${b64}`,
        },
        { type: "input_text", text: openAIExtractionPrompt() },
      ];

  const resp = await client.responses.create({
    model: DOCUMENT_PARSE_MODEL,
    input: [{ role: "user", content: userContent }],
    temperature: 0,
    max_output_tokens: 16_384,
    store: false,
  });

  if (resp.error) {
    throw new Error(resp.error.message ?? "OpenAI document parse failed");
  }

  let raw = textFromOpenAIResponse(resp).trim();
  if (raw === OPENAI_EXTRACTION_EMPTY_MARKER) return "";
  if (raw.startsWith(OPENAI_EXTRACTION_EMPTY_MARKER)) {
    raw = raw.slice(OPENAI_EXTRACTION_EMPTY_MARKER.length).trim();
  }
  return raw;
}

async function extractPdfTextWithPdfParse (buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return (data.text ?? "").trim();
}

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
    "Little or no text was available to index for this file after parsing. " +
    "An indexing notice was stored instead of body text. Try a different export, .txt, or a smaller file.";

  const notice =
    `[Indexed content unavailable for "${fileName}"] ` +
    `No usable text remained after extraction (${collapsedLen} characters). ` +
    `Typical causes: encrypted PDFs, corrupt files, or extraction limits. ` +
    `Try a smaller export, a .txt copy, or another PDF export from the source app.`;

  return {
    textForChunks: notice,
    weakIndexWarning,
  };
}

/** True when chunk text is our synthetic "no extractable text" notice. */
export function isPlaceholderIndexChunk (chunkContent: string): boolean {
  return chunkContent.trimStart().startsWith("[Indexed content unavailable");
}

export type ExtractTextOptions = {
  /** Original upload name; used for OpenAI `input_file` and MIME sniffing. */
  fileName?: string;
};

export async function extractTextFromBuffer (
  mimeType: string,
  buffer: Buffer,
  options?: ExtractTextOptions,
): Promise<string> {
  const fileName = options?.fileName ?? "upload";

  if (mimeType.startsWith("text/") || mimeType === "application/json") {
    return buffer.toString("utf8").trim();
  }

  const useOpenAI = shouldParseWithOpenAIResponses(mimeType, fileName);
  if (useOpenAI) {
    try {
      const fromApi = await extractTextWithOpenAIResponses(
        mimeType,
        buffer,
        fileName,
      );
      if (fromApi.length > 0) return fromApi;
    } catch (err) {
      console.warn("[extract] OpenAI document parse failed, using fallback if PDF", err);
    }
    const m = resolvedMimeForParsing(mimeType, fileName).toLowerCase();
    if (m === "application/pdf" || m.endsWith("/pdf")) {
      return extractPdfTextWithPdfParse(buffer);
    }
    return "";
  }

  if (mimeType === "application/pdf" || mimeType.endsWith("/pdf")) {
    return extractPdfTextWithPdfParse(buffer);
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
