import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailPreviewClient } from "@/components/dev/EmailPreviewClient";
import { getEmailPreviewSamples } from "@/lib/email/preview-samples";
import "./email-preview.css";

export const metadata: Metadata = {
  title: "Náhled e-mailů · Dev",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EmailPreviewPage() {
  const samples = getEmailPreviewSamples();
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Načítám náhled…</p>}>
      <EmailPreviewClient samples={samples} />
    </Suspense>
  );
}
