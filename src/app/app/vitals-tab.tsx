"use client";

export function VitalsTab() {
  return (
    <div className="space-y-4 pb-2">
      <div>
        <h2 className="text-lg font-semibold text-medi-ink">Vitals</h2>
        <p className="mt-1 text-sm text-medi-muted">
          When lab metrics are available from your records, they will appear here.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-medi-line bg-medi-canvas px-4 py-12 text-center shadow-medi-card">
        <p className="text-sm text-medi-muted">No vitals data yet.</p>
      </div>
    </div>
  );
}
