import type { Metadata } from "next";
import { LegalDocShell, LegalSection } from "@/components/legal-doc-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — MediSage",
  description:
    "How MediSage collects, uses, and shares information when you use the service.",
};

const LAST_UPDATED = "April 19, 2026";

export default function PrivacyPage() {
  return (
    <LegalDocShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection id="summary" title="Summary">
        <p>
          MediSage helps you organize health-related documents in your own Google
          Drive and ask questions about them. This policy describes how information
          is handled when you use the publicly deployed service (for example at{" "}
          <span className="font-mono text-xs text-medi-muted">
            medical-docs-web.vercel.app
          </span>
          ) or another URL where this software is operated (the &quot;Service&quot;).
        </p>
        <p>
          If you run your own copy of the software, whoever operates that deployment
          is responsible for their privacy practices; this document describes the
          typical behavior of the application as designed.
        </p>
      </LegalSection>

      <LegalSection id="collection" title="Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-medi-ink">Account and sign-in.</strong> When you
            sign in with Google, we receive identifiers and profile information that
            Google provides to the authentication provider (such as Supabase), for
            example your Google account ID, email address, and name.
          </li>
          <li>
            <strong className="text-medi-ink">Google Drive.</strong> If you grant
            access, the Service may create folders and files in your Google Drive and
            read or modify files that the application creates or that you open with
            the application, consistent with the OAuth scopes you approve (for
            example the narrow{" "}
            <code className="rounded bg-medi-canvas px-1 py-0.5 font-mono text-xs">
              drive.file
            </code>{" "}
            scope where configured).
          </li>
          <li>
            <strong className="text-medi-ink">Documents and chat.</strong> Content you
            upload or paste, extracted text, embeddings, and messages you send to the
            assistant may be processed and stored so the Service can classify,
            retrieve, and answer questions about your documents.
          </li>
          <li>
            <strong className="text-medi-ink">Technical data.</strong> Like most web
            applications, servers and vendors may log IP addresses, device and
            browser type, timestamps, and similar diagnostic data for security and
            reliability.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="use" title="How we use information">
        <ul className="list-disc space-y-2 pl-5">
          <li>To provide sign-in, sync, search, and chat features you request.</li>
          <li>
            To store and index document text and embeddings in the application
            database (for example PostgreSQL hosted on Supabase) so search and
            retrieval work.
          </li>
          <li>
            To send portions of your content to model providers (for example OpenAI)
            when you use AI features such as classification, parsing, embeddings, or
            chat.
          </li>
          <li>To maintain security, prevent abuse, and fix errors.</li>
          <li>To comply with law when required.</li>
        </ul>
      </LegalSection>

      <LegalSection id="sharing" title="Sharing and subprocessors">
        <p>
          The Service relies on infrastructure and APIs operated by third parties,
          including but not limited to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-medi-ink">Google</strong> (Google Identity and
            Google Drive);
          </li>
          <li>
            <strong className="text-medi-ink">Supabase</strong> (authentication and
            database);
          </li>
          <li>
            <strong className="text-medi-ink">Vercel</strong> (or another host) for
            application delivery and server-side processing;
          </li>
          <li>
            <strong className="text-medi-ink">OpenAI</strong> (or another AI provider
            you configure) for document understanding and chat.
          </li>
        </ul>
        <p>
          Those providers process data under their own terms and privacy policies. We
          do not sell your personal information as a commodity. We may disclose
          information if required by law or to protect rights, safety, and integrity.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="Retention and deletion">
        <p>
          Data is kept for as long as your account is active and as needed to provide
          the Service. You may be able to delete documents or your account through
          product controls where implemented; deleting content in Google Drive may not
          automatically remove all derived copies in the application database until
          corresponding deletion is processed. Backup and caching delays may apply.
        </p>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <p>
          We use industry-standard measures appropriate to the nature of the Service.
          No method of transmission or storage is completely secure. You are
          responsible for safeguarding your Google account and device access.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct, delete,
          export, or restrict processing of your personal data, and to object to
          certain processing. To exercise rights, contact the operator of the
          deployment you use (for example the support email shown on the OAuth consent
          screen for that deployment). You may also use controls Google provides for
          your Google account and Drive authorizations.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="International transfers">
        <p>
          Providers may process data in the United States and other countries. Where
          required, appropriate safeguards (such as standard contractual clauses) may
          be used by your subprocessors.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          The Service is not directed to children under 13 (or the age required by
          your jurisdiction). Do not use the Service for children&apos;s health data
          unless you have proper authority and compliance measures in place.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will
          be reflected by updating the &quot;Last updated&quot; date at the top of
          this page. Continued use of the Service after changes constitutes acceptance
          of the updated policy where permitted by law.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          For privacy questions about a specific deployment, contact the operator of
          that deployment using the support or developer contact information provided
          in the product or in the Google OAuth consent screen for that application.
        </p>
      </LegalSection>

      <p className="border-t border-medi-line pt-6 text-xs text-medi-muted">
        This policy is provided for transparency and is not legal advice. For
        regulated health data, obtain guidance from qualified counsel and complete
        required agreements (such as BAAs) with your vendors before production use.
      </p>
    </LegalDocShell>
  );
}
