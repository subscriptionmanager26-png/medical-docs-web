"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const MARQUEE_ITEMS = [
  "Blood reports",
  "Prescriptions",
  "Radiology scans",
  "Doctor's notes",
  "Discharge summaries",
  "Vaccination records",
  "Surgical reports",
  "Lipid panels",
  "Thyroid tests",
  "HbA1c trends",
  "Vitamin D levels",
  "ECG reports",
  "Eye checkups",
  "Dental records",
] as const;

function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-medi-accent/90 to-[#ff9a4d] shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_2px_10px_rgb(255_122_0/0.25)] ${className ?? ""}`}
    >
      <svg viewBox="0 0 17 17" className="size-[17px]" fill="none" aria-hidden>
        <path
          d="M8.5 2.5C8.5 2.5 4 6 4 10.5C4 13.1 6.1 15 8.5 15C10.9 15 13 13.1 13 10.5C13 6 8.5 2.5 8.5 2.5Z"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="1.2"
        />
        <path
          d="M6.5 10L8 11.5L11.5 8"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function PrimaryCta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href="/login"
      className={`inline-flex items-center justify-center rounded-full bg-medi-accent px-9 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-medi-accent-hover active:scale-[0.98] ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("opacity-100", "translate-y-0");
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => {
      el.classList.add(
        "opacity-0",
        "translate-y-6",
        "transition-all",
        "duration-700",
        "ease-out",
      );
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const marqueeDup = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-x-hidden bg-medi-canvas font-sans text-medi-ink"
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="sticky top-0 z-50 border-b border-medi-line/80 bg-medi-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-medi-ink">
            <LogoMark />
            MediSage
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-medi-muted md:flex">
            <a href="#how" className="transition hover:text-medi-ink">
              How it works
            </a>
            <a href="#features" className="transition hover:text-medi-ink">
              Features
            </a>
            <a href="#records" className="transition hover:text-medi-ink">
              Your records
            </a>
            <a href="#about" className="transition hover:text-medi-ink">
              About
            </a>
          </nav>
          <div className="flex items-center">
            <PrimaryCta className="!px-5 !py-2.5 text-xs sm:text-sm">
              Start Tracking
            </PrimaryCta>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 pb-20 pt-16 text-center sm:px-8">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-medi-line/60"
          style={{ width: 500, height: 500 }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-medi-line/50"
          style={{ width: 750, height: 750 }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-medi-line/40"
          style={{ width: 1020, height: 1020 }}
          aria-hidden
        />

        <div
          data-reveal
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-medi-line bg-white px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-medi-muted shadow-sm"
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-medi-success/50 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-medi-success" />
          </span>
          Medical records · Simplified
        </div>

        <h1
          data-reveal
          className="relative z-[1] max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-medi-ink sm:text-6xl sm:leading-[1.06]"
        >
          Clarity And Control
          <br />
          For Your Family&apos;s Health
        </h1>

        <p
          data-reveal
          className="relative z-[1] mx-auto mt-6 max-w-lg text-base font-normal leading-relaxed text-medi-muted sm:text-lg"
        >
          MediSage organises every test, diagnosis, and prescription into one place — and
          helps you understand what it all means, over a lifetime.
        </p>

        <div data-reveal className="relative z-[1] mt-10">
          <PrimaryCta>Start tracking →</PrimaryCta>
        </div>

        <div
          data-reveal
          className="relative z-[1] mt-16 flex flex-wrap items-center justify-center gap-8 border-t border-medi-line/80 pt-12 sm:gap-14"
        >
          {[
            ["5 min", "To set up your family"],
            ["100%", "Private & encrypted"],
            ["60+", "Biomarkers tracked"],
            ["∞", "Years of history"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <span className="block text-3xl font-semibold tracking-tight text-medi-ink sm:text-4xl">
                {n}
              </span>
              <span className="mt-1 block text-xs font-medium text-medi-muted">{l}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="border-y border-medi-line bg-white/70 py-7">
        <div className="animate-landing-marquee flex w-max">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0">
              {marqueeDup.map((label) => (
                <span
                  key={`${dup}-${label}`}
                  className="inline-flex items-center gap-2.5 whitespace-nowrap px-6 text-xs font-medium text-medi-muted"
                >
                  <span className="size-1 shrink-0 rounded-full bg-medi-line" />
                  {label}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section id="how" className="mx-auto max-w-6xl bg-white px-4 py-20 sm:px-8 sm:py-24">
        <p data-reveal className="text-[11px] font-semibold uppercase tracking-wider text-medi-accent">
          How it works
        </p>
        <h2
          data-reveal
          className="mt-3 max-w-xl text-balance text-3xl font-semibold leading-tight tracking-tight text-medi-ink sm:text-5xl"
        >
          Three steps to a <em className="not-italic text-medi-accent">lifetime</em> of clarity.
        </h2>

        <div className="mt-14 grid gap-px bg-medi-line sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Upload your records",
              body: "Add any medical document — PDFs, photos of reports, prescriptions. MediSage reads and organises them automatically using AI.",
              icon: (
                <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden>
                  <rect x="4" y="3" width="12" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.2" className="text-medi-accent" />
                  <line x1="7" y1="7.5" x2="13" y2="7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" className="text-medi-accent" />
                  <line x1="7" y1="10.5" x2="13" y2="10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" className="text-medi-accent" />
                  <line x1="7" y1="13.5" x2="10" y2="13.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" className="text-medi-accent" />
                </svg>
              ),
              bg: "bg-medi-canvas",
            },
            {
              n: "02",
              title: "We decode the jargon",
              body: "Every report is translated into plain language — what each value means, whether it's in range, and what changed since your last test.",
              icon: (
                <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden>
                  <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.2" className="text-medi-success" />
                  <path d="M7.5 10L9.2 11.8L12.5 8.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-medi-success" />
                </svg>
              ),
              bg: "bg-emerald-50/80",
            },
            {
              n: "03",
              title: "Track trends over time",
              body: "See how every biomarker has moved across years — for you and every member of your family — in one continuous health timeline.",
              icon: (
                <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden>
                  <polyline points="3,14 6.5,9 10,12 14,7 17,5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-medi-warning" />
                  <circle cx="17" cy="5" r="1.5" fill="currentColor" className="text-medi-warning" />
                </svg>
              ),
              bg: "bg-amber-50/60",
            },
          ].map((step) => (
            <div
              key={step.n}
              data-reveal
              className={`border border-medi-line p-8 transition-colors hover:bg-medi-canvas sm:p-10 ${step.bg}`}
            >
              <div className="font-semibold text-6xl leading-none text-medi-line sm:text-7xl">{step.n}</div>
              <div className="mt-6 flex size-11 items-center justify-center rounded-2xl border border-medi-line bg-white shadow-sm">
                {step.icon}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-medi-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-medi-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-24">
        <p data-reveal className="text-[11px] font-semibold uppercase tracking-wider text-medi-accent">
          What you get
        </p>
        <h2
          data-reveal
          className="mt-3 max-w-xl text-balance text-3xl font-semibold leading-tight tracking-tight text-medi-ink sm:text-5xl"
        >
          Everything your family&apos;s <em className="not-italic text-medi-accent">health deserves.</em>
        </h2>

        <div className="mt-14 grid max-w-4xl gap-3.5 sm:grid-cols-2">
          {[
            {
              title: "Family health vault",
              body: "One account for your entire family. Each member gets their own timeline — parents, children, grandparents — all in one place.",
              accent: "border-t-medi-accent",
            },
            {
              title: "Biomarker timeline",
              body: "Glucose, cholesterol, thyroid — every tracked value shown over months and years so trends become unmissably visible.",
              accent: "border-t-medi-success",
            },
            {
              title: "Smart alerts",
              body: "Get notified when a value drifts outside the optimal range — or when a follow-up test is due based on your last report date.",
              accent: "border-t-medi-warning",
            },
            {
              title: "Plain-language reports",
              body: "No more googling medical terms at midnight. Every report is decoded into what it actually means for your health, in simple words.",
              accent: "border-t-medi-accent",
            },
          ].map((f) => (
            <div
              key={f.title}
              data-reveal
              className={`rounded-3xl border border-medi-line bg-white p-8 shadow-medi-card transition hover:-translate-y-0.5 hover:shadow-medi-float ${f.accent} border-t-2`}
            >
              <h3 className="text-lg font-semibold text-medi-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-medi-muted">{f.body}</p>
            </div>
          ))}

          <div
            data-reveal
            className="rounded-3xl border border-medi-line bg-white p-8 shadow-medi-card transition hover:-translate-y-0.5 hover:shadow-medi-float sm:col-span-2 sm:flex sm:items-center sm:gap-10 sm:p-10"
          >
            <div className="mb-5 flex size-12 shrink-0 items-center justify-center rounded-2xl border border-medi-line bg-emerald-50/80 sm:mb-0 sm:size-14">
              <svg viewBox="0 0 22 22" className="size-6" fill="none" aria-hidden>
                <path d="M4 17C4 13.5 7 11 11 11C15 11 18 13.5 18 17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-medi-success" />
                <circle cx="11" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.2" className="text-medi-success" />
                <circle cx="17.5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.1" className="text-medi-success" />
                <circle cx="4.5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.1" className="text-medi-success" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-medi-ink">Shared access for caregivers</h3>
              <p className="mt-2 text-sm leading-relaxed text-medi-muted">
                Grant a family doctor or specialist view-only access to a member&apos;s records — with one tap, no printing, no WhatsApp chaos. Your data stays yours, always.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="records" className="border-y border-medi-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:grid-cols-2 sm:gap-16 sm:px-8 sm:py-24">
          <div>
            <p data-reveal className="text-[11px] font-semibold uppercase tracking-wider text-medi-accent">
              Your medical history
            </p>
            <h2
              data-reveal
              className="mt-3 max-w-md text-balance text-3xl font-semibold leading-tight tracking-tight text-medi-ink sm:text-5xl"
            >
              Every record.
              <br />
              <em className="not-italic text-medi-accent">Always there</em>
              <br />
              when you need it.
            </h2>
            <p data-reveal className="mt-6 max-w-md text-sm leading-relaxed text-medi-muted sm:text-[15px]">
              How many times have you scrambled to find an old report before a doctor&apos;s visit? Or forgotten what your
              cholesterol was two years ago? MediSage ends that forever — every document, searchable, readable, and
              understood.
            </p>
            <div data-reveal className="mt-8">
              <PrimaryCta>Start tracking →</PrimaryCta>
            </div>
          </div>

          <div data-reveal className="flex flex-col gap-2.5">
            {[
              {
                title: "Complete Blood Count",
                meta: "Dr. Anita Sharma · Fortis Hospital",
                badge: "New",
                badgeClass: "border border-medi-success/30 bg-medi-success/10 text-emerald-800",
                featured: true,
              },
              {
                title: "Lipid Panel + HbA1c",
                meta: "Thyrocare · Home collection",
                right: "3 months ago",
              },
              {
                title: "Thyroid Function (TSH)",
                meta: "Metropolis · Prescription attached",
                badge: "6 mo ago",
                badgeClass: "border border-medi-line bg-medi-canvas text-medi-muted",
              },
              {
                title: "ECG + Cardiac Panel",
                meta: "Max Healthcare · Routine checkup",
                right: "1 year ago",
              },
              {
                title: "Annual physical + X-ray",
                meta: "Apollo Clinic",
                right: "2 years ago",
                dim: true,
              },
            ].map((r, i) => (
              <div key={r.title}>
                <div
                  className={`flex items-center gap-3.5 rounded-2xl border p-4 transition hover:translate-x-1 hover:shadow-md ${
                    r.featured
                      ? "border-medi-line bg-white shadow-medi-card"
                      : r.dim
                        ? "border-medi-line/80 bg-medi-canvas/50 opacity-60"
                        : "border-medi-line bg-medi-canvas hover:bg-white"
                  }`}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-medi-line bg-white">
                    <span className="text-[10px] font-semibold text-medi-muted">PDF</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-medi-ink">{r.title}</p>
                    <p className="text-xs text-medi-muted">{r.meta}</p>
                  </div>
                  {"badge" in r && r.badge ? (
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${r.badgeClass}`}>
                      {r.badge}
                    </span>
                  ) : "right" in r && r.right ? (
                    <span className="shrink-0 text-[11px] text-medi-muted">{r.right}</span>
                  ) : null}
                </div>
                {i < 4 ? <div className="ml-[22px] h-5 w-px bg-medi-line" aria-hidden /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8">
        <p data-reveal className="text-sm leading-relaxed text-medi-muted">
          <strong className="font-semibold text-medi-ink">Today&apos;s MediSage build</strong> connects to your Google account,
          stores classified documents in your Drive vault, and answers questions with AI grounded in your uploaded files.
          Roadmap features on this page (family timelines, alerts, caregiver sharing) describe where we&apos;re headed — not
          all are live yet. Always complete your own review before using for regulated health data.
        </p>
      </section>

      <section className="relative overflow-hidden bg-medi-canvas px-4 py-24 text-center sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-medi-line/70" style={{ width: 380, height: 380 }} aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-medi-line/50" style={{ width: 620, height: 620 }} aria-hidden />
        <h2
          data-reveal
          className="relative z-[1] mx-auto max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight text-medi-ink sm:text-6xl"
        >
          Your family&apos;s health,
          <br />
          <em className="not-italic text-medi-accent">finally organised.</em>
        </h2>
        <p data-reveal className="relative z-[1] mx-auto mt-5 max-w-md text-sm leading-relaxed text-medi-muted sm:text-base">
          Start building your family health timeline today. Free to get started — no credit card needed.
        </p>
        <div data-reveal className="relative z-[1] mt-10">
          <PrimaryCta>Start tracking →</PrimaryCta>
        </div>
      </section>

      <footer className="bg-medi-ink px-4 py-16 text-medi-canvas sm:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 sm:flex-row sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-xl font-semibold text-white">
              <LogoMark />
              MediSage
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-white/50">
              Clarity and control for your family&apos;s health. Medical records, decoded and tracked for a lifetime.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-14">
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-white/40">Product</p>
              <a href="#how" className="mb-2 block text-sm font-light text-white/55 transition hover:text-white/90">
                How it works
              </a>
              <a href="#features" className="mb-2 block text-sm font-light text-white/55 transition hover:text-white/90">
                Features
              </a>
              <Link href="/app" className="mb-2 block text-sm font-light text-white/55 transition hover:text-white/90">
                Open app
              </Link>
              <Link href="/cas" className="mb-2 block text-sm font-light text-white/55 transition hover:text-white/90">
                CAS request
              </Link>
            </div>
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-white/40">Company</p>
              <a href="#about" className="mb-2 block text-sm font-light text-white/55 transition hover:text-white/90">
                About
              </a>
              <Link href="/login" className="mb-2 block text-sm font-light text-white/55 transition hover:text-white/90">
                Sign in
              </Link>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-white/40">Legal</p>
              <Link href="/privacy" className="mb-2 block text-sm font-light text-white/55 transition hover:text-white/90">
                Privacy policy
              </Link>
              <Link href="/tos" className="mb-2 block text-sm font-light text-white/55 transition hover:text-white/90">
                Terms of use
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-6xl flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 text-xs font-light text-white/45 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} MediSage. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-medi-success" aria-hidden />
            Private vault in your Google Drive · AI grounded in your uploads
          </p>
        </div>
      </footer>
    </div>
  );
}
