import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: "MediSage — Medical records you control",
  description:
    "Organize blood work, scans, and visit notes in your Google Drive, then ask questions with AI grounded in your own documents—not the public web.",
};

export default function Home() {
  return <LandingPage />;
}
