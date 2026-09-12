import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const maisonNeue = localFont({
  src: [
    {
      path: "../fonts/MaisonNeue-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/MaisonNeue-Light.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/MaisonNeue-Demi.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/MaisonNeue-Demi.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/MaisonNeue-Demi.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/MaisonNeue-Demi.otf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-maison-neue",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dárkové poukazy | Long Story Short",
  description:
    "Kupte dárkový poukaz Long Story Short — na částku nebo na zážitek.",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={maisonNeue.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
