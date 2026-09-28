import type { Metadata } from "next";
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
  return <EmailPreviewClient samples={samples} />;
}
