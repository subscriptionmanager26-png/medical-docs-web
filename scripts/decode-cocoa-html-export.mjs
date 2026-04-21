/**
 * Decodes TextEdit/Cocoa "HTML Writer" exports back to plain source text.
 * Usage: node scripts/decode-cocoa-html-export.mjs reference-ui/app.jsx > reference-ui/app.recovered.jsx
 */
import fs from "node:fs";

const inputPath = process.argv[2] || "reference-ui/app.jsx";
const raw = fs.readFileSync(inputPath, "utf8");
const bodyMatch = raw.match(/<body>([\s\S]*?)<\/body>/i);
if (!bodyMatch) {
  console.error("No <body> found");
  process.exit(1);
}
let body = bodyMatch[1];

body = body.replace(/<span class="Apple-converted-space">\s*<\/span>/gi, " ");
body = body.replace(/<span class="Apple-converted-space">[^<]*<\/span>/gi, " ");
body = body.replace(/<br\s*\/?>/gi, "\n");

function stripTags(fragment) {
  return fragment.replace(/<[^>]+>/g, "");
}

const parts = body.split(/<\/p>/gi);
const lines = parts
  .map((chunk) => stripTags(chunk).replace(/\u00a0/g, " ").trimEnd())
  .filter((line) => line.length > 0);

let out = lines.join("\n");
out = out
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&amp;/g, "&");

process.stdout.write(out);
