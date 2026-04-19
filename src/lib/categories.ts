/** Fixed taxonomy for Drive subfolders and classification. */
export const DOCUMENT_CATEGORIES = [
  "Lab Reports",
  "Imaging",
  "Prescriptions",
  "Insurance",
  "Other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
