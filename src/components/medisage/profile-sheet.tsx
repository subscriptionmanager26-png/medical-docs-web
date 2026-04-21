"use client";

type ProfileSheetProps = {
  open: boolean;
  onClose: () => void;
  userLabel: string;
  avatarUrl: string | null;
  message: string | null;
  initing: boolean;
  onInitDrive: () => void;
  onSignOut: () => void;
};

export function ProfileSheet({
  open,
  onClose,
  userLabel,
  avatarUrl,
  message,
  initing,
  onInitDrive,
  onSignOut,
}: ProfileSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 pb-28 backdrop-blur-sm sm:items-center sm:pb-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-medi-float ring-1 ring-medi-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-medi-line px-4 py-3">
          <div className="min-w-0">
            <p
              id="profile-sheet-title"
              className="text-sm font-semibold text-medi-ink"
            >
              Profile
            </p>
            <p className="mt-0.5 truncate text-xs text-medi-muted">
              Account and vault setup
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-2 py-1 text-sm text-medi-muted hover:bg-medi-canvas"
            aria-label="Close profile"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-4 py-5">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-medi-accent p-[2px] shadow-sm">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-semibold text-medi-accent">
                    {(userLabel || "M").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-medi-ink">
                {userLabel || "Signed in"}
              </p>
              <p className="mt-0.5 text-xs text-medi-muted">MediSage account</p>
            </div>
          </div>

          {message ? (
            <p className="rounded-2xl border border-medi-accent/25 bg-medi-accent/10 px-4 py-3 text-sm text-medi-ink">
              {message}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void onInitDrive()}
            disabled={initing}
            className="w-full rounded-2xl border border-medi-line bg-white px-4 py-3 text-left text-sm font-semibold text-medi-ink shadow-medi-card transition hover:bg-medi-canvas disabled:opacity-50"
          >
            {initing ? "Preparing Drive…" : "Prepare Google Drive folders"}
          </button>

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="w-full rounded-2xl bg-medi-ink px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
          >
            Sign out
          </button>

          <p className="text-center text-[11px] text-medi-muted">
            MediSage does not replace a clinician. AI answers may be incomplete.
          </p>
        </div>
      </div>
    </div>
  );
}
