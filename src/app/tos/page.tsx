import type { Metadata } from "next";
import { LegalDocShell, LegalSection } from "@/components/legal-doc-shell";

export const metadata: Metadata = {
  title: "Terms of Service — MediSage",
  description: "Terms governing your use of the MediSage application.",
};

const LAST_UPDATED = "April 19, 2026";

export default function TermsPage() {
  return (
    <LegalDocShell title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <LegalSection id="agreement" title="Agreement to these terms">
        <p>
          By accessing or using MediSage (the &quot;Service&quot;), including
          deployments such as{" "}
          <span className="font-mono text-xs text-medi-muted">
            medical-docs-web.vercel.app
          </span>
          , you agree to these Terms of Service. If you do not agree, do not use the
          Service.
        </p>
      </LegalSection>

      <LegalSection id="service" title="The Service">
        <p>
          The Service provides tools to sign in with Google, store documents in your
          Google Drive, process and index document content, and interact with an AI
          assistant over your materials. Features may change; we do not guarantee
          uninterrupted or error-free operation.
        </p>
      </LegalSection>

      <LegalSection id="account" title="Accounts and access">
        <p>
          You must have authority to use the Google account you connect. You are
          responsible for maintaining the confidentiality of your account and for
          activity that occurs under your account, except where caused by our gross
          negligence or willful misconduct.
        </p>
      </LegalSection>

      <LegalSection id="content" title="Your content">
        <p>
          You retain rights to content you submit. You grant the Service permission
          to host, process, transmit, display, and create derivative works (such as
          extracted text and embeddings) solely as needed to operate features you use.
          You represent that you have the rights necessary to upload or connect your
          content and that doing so does not violate applicable law or third-party
          rights.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use the Service in violation of law or third-party rights.</li>
          <li>
            Attempt to access other users&apos; data, probe systems without
            authorization, or overload or disrupt the Service.
          </li>
          <li>
            Upload malware or use the Service to generate or distribute unlawful,
            deceptive, or harmful material.
          </li>
          <li>
            Misrepresent your identity or affiliation, or use the Service to provide
            regulated professional services (such as practicing medicine) without
            proper licensure and compliance.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="medical" title="Not medical advice">
        <p>
          The Service is not a medical device and does not provide medical advice,
          diagnosis, or treatment. Outputs from AI features may be incomplete or
          incorrect. Always consult qualified healthcare professionals for medical
          decisions. Emergency? Contact local emergency services.
        </p>
      </LegalSection>

      <LegalSection id="ai" title="AI features">
        <p>
          AI-generated responses are probabilistic and may contain errors. You are
          responsible for verifying information before relying on it, especially for
          health, legal, or financial matters.
        </p>
      </LegalSection>

      <LegalSection id="third-parties" title="Third-party services">
        <p>
          The Service integrates Google, Supabase, hosting providers, and AI vendors.
          Your use of those services may be subject to their separate terms and
          policies. We are not responsible for third-party failures outside our
          reasonable control.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="Disclaimer of warranties">
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot;
          WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING
          IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          AND NON-INFRINGEMENT, TO THE FULLEST EXTENT PERMITTED BY LAW.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Limitation of liability">
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, THE OPERATOR OF THE SERVICE AND ITS
          SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR
          OTHER INTANGIBLE LOSSES, ARISING FROM YOUR USE OF OR INABILITY TO USE THE
          SERVICE. OUR AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE WILL
          NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE
          TWELVE MONTHS BEFORE THE CLAIM, OR (B) ONE HUNDRED US DOLLARS (US$100), IF
          YOU HAVE NOT PAID ANYTHING.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations; in those cases, our
          liability is limited to the maximum extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection id="indemnity" title="Indemnity">
        <p>
          You will defend and indemnify the operator of the Service and its
          affiliates, directors, employees, and agents against any claims, damages,
          losses, and expenses (including reasonable attorneys&apos; fees) arising
          from your content, your use of the Service, or your violation of these
          Terms or law.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate
          access if we reasonably believe you violated these Terms or to protect the
          Service or others. Provisions that by their nature should survive will
          survive termination.
        </p>
      </LegalSection>

      <LegalSection id="changes-terms" title="Changes to these terms">
        <p>
          We may modify these Terms. We will post the updated Terms and revise the
          &quot;Last updated&quot; date. Continued use after changes become effective
          constitutes acceptance where permitted by law. If you do not agree, stop
          using the Service.
        </p>
      </LegalSection>

      <LegalSection id="law" title="Governing law and disputes">
        <p>
          These Terms are governed by the laws of the State of Delaware, United
          States, without regard to conflict-of-law rules, except that mandatory
          consumer protections in your country of residence may still apply where
          required. Courts in Delaware (or the U.S. federal courts located there) will
          have exclusive jurisdiction for disputes, unless applicable law requires
          otherwise.
        </p>
        <p className="text-xs text-medi-muted">
          If you operate a different deployment, you may replace this section with the
          governing law and venue that apply to your organization.
        </p>
      </LegalSection>

      <LegalSection id="contact-tos" title="Contact">
        <p>
          For questions about these Terms for a specific deployment, contact the
          operator using the support or developer contact shown in the product or on
          the Google OAuth consent screen for that application.
        </p>
      </LegalSection>

      <p className="border-t border-medi-line pt-6 text-xs text-medi-muted">
        These Terms are a practical template and are not a substitute for legal advice.
        Have counsel review them before relying on them for a commercial or regulated
        offering.
      </p>
    </LegalDocShell>
  );
}
