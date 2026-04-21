import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Google Search Console (OAuth / domain verification). Renders the standard meta tag on every page. */
const GOOGLE_SITE_VERIFICATION = "p0MfWb8SIsg47-jGnXDlPBTR5Xk8RWt1aZrFb1BC7Is";

export const metadata: Metadata = {
  title: "MediSage — Health data copilot",
  description:
    "MediSage is your private health document copilot: organize medical files in Google Drive and ask questions with AI grounded in your own documents.",
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
