import { Readable } from "stream";
import { google } from "googleapis";
import { DOCUMENT_CATEGORIES } from "@/lib/categories";

const ROOT_FOLDER_NAME = "Medical Docs (Vault)";

export function getDriveClient(refreshToken: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI ?? undefined,
  );
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2 });
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

  if (!rootId) {
    const created = await drive.files.create({
      requestBody: {
        name: ROOT_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    rootId = created.data.id!;
  }

  for (const cat of DOCUMENT_CATEGORIES) {
    if (categoryIds[cat]) continue;
    const sub = await drive.files.create({
      requestBody: {
        name: cat,
        mimeType: "application/vnd.google-apps.folder",
        parents: [rootId],
      },
      fields: "id",
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
