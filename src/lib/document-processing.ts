import pdfParse from "pdf-parse";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/categories";
import OpenAI, { toFile } from "openai";
import { requireEnv } from "@/lib/env";

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;

/** Primary model for Responses API PDF/image extraction. */
const DOCUMENT_PARSE_MODEL =
  process.env.OPENAI_DOCUMENT_PARSE_MODEL ?? "gpt-4o-mini";

/** Second model tried when the primary returns empty (image-heavy PDFs often need full gpt-4o). */
const DOCUMENT_PARSE_FALLBACK_MODEL =
  process.env.OPENAI_DOCUMENT_PARSE_FALLBACK_MODEL ?? "gpt-4o";

const OPENAI_PARSE_DISABLED =
  process.env.OPENAI_DOCUMENT_PARSE_DISABLED === "1" ||
  process.env.OPENAI_DOCUMENT_PARSE_DISABLED === "true";

/** Model must output this alone when nothing is readable (easier to detect than free-form). */
const OPENAI_EXTRACTION_EMPTY_MARKER = "NO_READABLE_CONTENT";

function modelsToTryForDocumentParse (): string[] {
  return [
    ...new Set([DOCUMENT_PARSE_MODEL, DOCUMENT_PARSE_FALLBACK_MODEL].filter(Boolean)),
  ];
}

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

function stripEmptyContentMarker (raw: string): string {
  const t = raw.trim();
  if (t === OPENAI_EXTRACTION_EMPTY_MARKER) return "";
  if (t.startsWith(OPENAI_EXTRACTION_EMPTY_MARKER)) {
    return t.slice(OPENAI_EXTRACTION_EMPTY_MARKER.length).trim();
  }
  return t;
}

/** Collect assistant-visible text from a Responses API object (shape varies by model). */
function collectTextFromOpenAIResponse (resp: unknown): string {
  const r = resp as Record<string, unknown>;
  const direct = r.output_text;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  const output = r.output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    collectFromOutputItem(item, parts);
  }
  return parts.join("\n\n").trim();
}

function collectFromOutputItem (item: unknown, acc: string[]): void {
  if (item == null || typeof item !== "object") return;
  const o = item as Record<string, unknown>;
  if (o.type === "output_text" && typeof o.text === "string" && o.text.trim()) {
    acc.push(o.text);
  }
  if (o.type === "message" && Array.isArray(o.content)) {
    for (const c of o.content) {
      collectFromOutputItem(c, acc);
    }
  }
}

type UserContentPart =
  | { type: "input_file"; file_id: string }
  | { type: "input_file"; filename: string; file_data: string }
  | { type: "input_image"; file_id: string; detail: "high" }
  | { type: "input_image"; image_url: string; detail: "high" }
  | { type: "input_text"; text: string };

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
  const safeName = safeFileNameForOpenAI(fileName);
  const isImage = resolvedMime.startsWith("image/");
  const pdfFilename = /\.pdf$/i.test(safeName) ? safeName : `${safeName}.pdf`;
  const uploadBasename = isImage ? safeName : pdfFilename;
  const prompt = openAIExtractionPrompt();
  const models = modelsToTryForDocumentParse();

  async function oneParse (model: string, content: UserContentPart[]): Promise<string> {
    const resp = await client.responses.create({
      model,
      input: [{ role: "user", content }],
      temperature: 0,
      max_output_tokens: 32_768,
      store: false,
      truncation: "auto",
    });
    if (resp.error) {
      throw new Error(resp.error.message ?? "OpenAI document parse failed");
    }
    const status = (resp as { status?: string }).status;
    if (status && status !== "completed") {
      const inc = (resp as { incomplete_details?: { reason?: string } })
        .incomplete_details;
      console.warn("[extract] non-completed response", {
        model,
        status,
        incomplete: inc ?? null,
      });
    }
    const raw = stripEmptyContentMarker(collectTextFromOpenAIResponse(resp));
    if (!raw) {
      console.warn("[extract] empty text after parse", {
        model,
        status,
        outputItems: Array.isArray((resp as { output?: unknown }).output)
          ? (resp as { output: unknown[] }).output.length
          : 0,
      });
    }
    return raw;
  }

  function base64Content (): UserContentPart[] {
    const b64 = buffer.toString("base64");
    if (isImage) {
      return [
        {
          type: "input_image",
          image_url: `data:${resolvedMime};base64,${b64}`,
          detail: "high",
        },
        { type: "input_text", text: prompt },
      ];
    }
    return [
      {
        type: "input_file",
        filename: pdfFilename,
        file_data: `data:${resolvedMime};base64,${b64}`,
      },
      { type: "input_text", text: prompt },
    ];
  }

  function fileIdContent (fileId: string): UserContentPart[] {
    if (isImage) {
      return [
        { type: "input_image", file_id: fileId, detail: "high" },
        { type: "input_text", text: prompt },
      ];
    }
    return [{ type: "input_file", file_id: fileId }, { type: "input_text", text: prompt }];
  }

  let uploadedId: string | null = null;
  try {
    const uploadable = await toFile(buffer, uploadBasename, { type: resolvedMime });
    const created = await client.files.create({
      file: uploadable,
      purpose: "user_data",
    });
    uploadedId = created.id;
    for (const model of models) {
      try {
        const t = await oneParse(model, fileIdContent(uploadedId));
        if (t.length > 0) {
          console.info("[extract] OpenAI extraction ok", {
            model,
            via: "file_id",
            chars: t.length,
          });
          return t;
        }
      } catch (e) {
        console.warn("[extract] file_id parse attempt failed", { model, err: e });
      }
    }
  } catch (e) {
    console.warn("[extract] OpenAI files.create failed; will try base64", e);
  } finally {
    if (uploadedId) {
      await client.files.delete(uploadedId).catch(() => {});
      uploadedId = null;
    }
  }

  for (const model of models) {
    try {
      const t = await oneParse(model, base64Content());
      if (t.length > 0) {
        console.info("[extract] OpenAI extraction ok", {
          model,
          via: "base64",
          chars: t.length,
        });
        return t;
      }
    } catch (e) {
      console.warn("[extract] base64 parse attempt failed", { model, err: e });
    }
  }

  return "";
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
    `The hosted parser and PDF fallback both produced nothing usable. ` +
    `For scans or photos inside a PDF, re-upload after deploying the latest app (uses OpenAI file upload + gpt-4o fallback), or upload a .txt / image file instead.`;

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
