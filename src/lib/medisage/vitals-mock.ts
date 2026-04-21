/**
 * Placeholder vitals data for the Vitals tab until extraction pipelines feed real rows.
 * Counts align with the summary cards on Home.
 */
export const VITALS_SUMMARY = {
  urgent: 1,
  attention: 1,
  normal: 2,
} as const;

export const VITALS_FOCUS = {
  title: "Focus: Vitamin D, 25-OH",
  body: "Your latest value is below the optimal range. Consider discussing supplementation or sun exposure with your clinician—not medical advice.",
} as const;

export type BiomarkerTone = "urgent" | "warning" | "success";

export type BiomarkerRow = {
  id: number;
  section: string;
  category: string;
  name: string;
  value: string;
  status: string;
  tone: BiomarkerTone;
  /** SVG polyline points in viewBox 0 0 100 40 */
  sparkPoints: string;
};

export const BIOMARKERS: BiomarkerRow[] = [
  {
    id: 4,
    section: "Urgent Review",
    category: "Cardiac",
    name: "Troponin T",
    value: "0.4 ng/mL",
    status: "High",
    tone: "urgent",
    sparkPoints: "0,30 30,10 60,35 100,5",
  },
  {
    id: 3,
    section: "Attention Needed",
    category: "Hormones",
    name: "Vitamin D, 25-OH",
    value: "24 ng/mL",
    status: "Low",
    tone: "warning",
    sparkPoints: "0,10 30,15 60,30 100,35",
  },
  {
    id: 1,
    section: "Normal",
    category: "Lipid Panel",
    name: "Apolipoprotein A1",
    value: "170 mg/dL",
    status: "Optimal",
    tone: "success",
    sparkPoints: "0,35 30,20 60,30 100,10",
  },
  {
    id: 2,
    section: "Normal",
    category: "Metabolic",
    name: "Glucose (Fasting)",
    value: "88 mg/dL",
    status: "Optimal",
    tone: "success",
    sparkPoints: "0,15 35,25 65,20 100,20",
  },
];

export function toneToHex(tone: BiomarkerTone): string {
  switch (tone) {
    case "urgent":
      return "#ef4444";
    case "warning":
      return "#f59e0b";
    default:
      return "#22c55e";
  }
}
