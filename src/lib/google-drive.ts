import { Readable } from "stream";
import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import { DOCUMENT_CATEGORIES } from "@/lib/categories";

const ROOT_FOLDER_NAME = "Medical Docs (Vault)";

type GoogleApiErrorBody = {
  error?: {
    message?: string;
    errors?: Array<{ reason?: string; message?: string; domain?: string }>;
  };
};

/** Best-effort message for Drive API failures (403, 404, quota, etc.). */
export function formatGoogleDriveError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const ax = err as Error & {
    response?: { status?: number; data?: GoogleApiErrorBody };
  };
  const status = ax.response?.status;
  const apiErr = ax.response?.data?.error;
  const parts: string[] = [];
  if (typeof status === "number") parts.push(`HTTP ${status}`);
  if (apiErr?.message) parts.push(apiErr.message);
  const reasons = apiErr?.errors
    ?.map((e) => e.reason || e.message)
    .filter(Boolean);
  if (reasons?.length) parts.push(`[${reasons.join(", ")}]`);
  if (parts.length > 0) return parts.join(" — ");
  return err.message;
}

/** True when the Drive API rejected the token for missing OAuth scopes. */
export function isInsufficientDriveScopeError(err: unknown): boolean {
  return formatGoogleDriveError(err)
    .toLowerCase()
    .includes("insufficient authentication scopes");
}

/** Short copy for upload / UI when Google did not grant drive.file on the refresh token. */
export function insufficientDriveScopeUserMessage(): string {
  return (
    "Google has not granted this app permission to create files in your Drive for this login. " +
    "Sign out of MediSage, sign in with Google again, and choose **Allow** when asked for Google Drive access. " +
    "If it still fails, open Google Account → Security → “Third-party apps with account access”, remove MediSage, then sign in once more. " +
    "In Google Cloud Console, ensure the OAuth consent screen lists the scope `…/auth/drive.file`."
  );
}

export function getDriveClient(refreshToken: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI ?? undefined,
  );
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2 });
}

async function driveFileExists(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<boolean> {
  try {
    await drive.files.get({
      fileId,
      fields: "id",
      supportsAllDrives: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function ensureDriveStructure(
  refreshToken: string,
  existing?: {
    root_folder_id: string;
    category_folder_ids: Record<string, string> | null;
  } | null,
) {
  const drive = getDriveClient(refreshToken);
  let rootId = existing?.root_folder_id;
  const categoryIds: Record<string, string> = {
    ...(existing?.category_folder_ids ?? {}),
  };

  if (rootId && !(await driveFileExists(drive, rootId))) {
    rootId = undefined;
    for (const k of Object.keys(categoryIds)) {
      delete categoryIds[k];
    }
  }

  if (!rootId) {
    const created = await drive.files.create({
      requestBody: {
        name: ROOT_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
      supportsAllDrives: true,
    });
    rootId = created.data.id!;
  }

  for (const cat of DOCUMENT_CATEGORIES) {
    const existingCatId = categoryIds[cat];
    if (existingCatId && (await driveFileExists(drive, existingCatId))) {
      continue;
    }
    if (existingCatId) {
      delete categoryIds[cat];
    }
    const sub = await drive.files.create({
      requestBody: {
        name: cat,
        mimeType: "application/vnd.google-apps.folder",
        parents: [rootId],
      },
      fields: "id",
      supportsAllDrives: true,
    });
    categoryIds[cat] = sub.data.id!;
  }

  return { root_folder_id: rootId, category_folder_ids: categoryIds };
}

export async function uploadToDriveFolder(params: {
  refreshToken: string;
  folderId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const drive = getDriveClient(params.refreshToken);
  const created = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.buffer),
    },
    fields: "id",
    supportsAllDrives: true,
  });
  return created.data.id!;
}

export async function getFileMetadata(
  refreshToken: string,
  fileId: string,
) {
  const drive = getDriveClient(refreshToken);
  const meta = await drive.files.get({
    fileId,
    fields: "name, mimeType",
    supportsAllDrives: true,
  });
  return meta.data;
}

export async function createReadStreamForFile(
  refreshToken: string,
  fileId: string,
) {
  const drive = getDriveClient(refreshToken);
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" },
  );
  return res.data as NodeJS.ReadableStream;
}
