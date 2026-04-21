"use client";

import { Sparkline } from "@/components/medisage/sparkline";
import {
  BIOMARKERS,
  VITALS_FOCUS,
  VITALS_SUMMARY,
  toneToHex,
} from "@/lib/medisage/vitals-mock";

function tonePill(tone: "urgent" | "warning" | "success") {
  switch (tone) {
    case "urgent":
      return "bg-medi-danger text-white";
    case "warning":
      return "bg-medi-warning text-medi-ink";
    default:
      return "bg-medi-success text-white";
  }
}

export function VitalsTab() {
  const sections = ["Urgent Review", "Attention Needed", "Normal"] as const;
  return (
    <div className="space-y-5 pb-2">
      <div>
        <h2 className="text-lg font-semibold text-medi-ink">Health vitals</h2>
        <p className="mt-1 text-sm text-medi-muted">
          Sample markers for layout—connect your lab pipeline to replace this view.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-medi-line bg-white p-3 text-center shadow-medi-card">
          <p className="text-2xl font-semibold tabular-nums text-medi-danger">
            {VITALS_SUMMARY.urgent}
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-medi-muted">
            Urgent
          </p>
        </div>
        <div className="rounded-2xl border border-medi-line bg-white p-3 text-center shadow-medi-card">
          <p className="text-2xl font-semibold tabular-nums text-medi-warning">
            {VITALS_SUMMARY.attention}
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-medi-muted">
            Attention
          </p>
        </div>
        <div className="rounded-2xl border border-medi-line bg-white p-3 text-center shadow-medi-card">
          <p className="text-2xl font-semibold tabular-nums text-medi-success">
            {VITALS_SUMMARY.normal}
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-medi-muted">
            Normal
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-medi-warning/40 bg-medi-warning/10 p-4 shadow-medi-card">
        <p className="text-sm font-semibold text-medi-ink">{VITALS_FOCUS.title}</p>
        <p className="mt-2 text-xs leading-relaxed text-medi-muted">{VITALS_FOCUS.body}</p>
      </div>

      {sections.map((section) => {
        const rows = BIOMARKERS.filter((b) => b.section === section);
        if (rows.length === 0) return null;
        return (
          <div key={section}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-medi-muted">
              {section}
            </p>
            <ul className="space-y-2">
              {rows.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 rounded-2xl border border-medi-line bg-white px-3 py-3 shadow-medi-card"
                >
                  <Sparkline points={b.sparkPoints} endColor={toneToHex(b.tone)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-medi-muted">{b.category}</p>
                    <p className="truncate text-sm font-semibold text-medi-ink">{b.name}</p>
                    <p className="text-xs text-medi-muted">{b.value}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${tonePill(b.tone)}`}
                  >
                    {b.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
