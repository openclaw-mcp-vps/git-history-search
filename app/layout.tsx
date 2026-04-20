import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap"
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Git History Search",
    template: "%s | Git History Search"
  },
  description:
    "Find the exact commits, PRs, and issues that changed auth, rate limiting, or any codepath by asking in plain English.",
  keywords: [
    "git history search",
    "semantic code search",
    "github commit search",
    "developer productivity",
    "engineering onboarding"
  ],
  openGraph: {
    title: "Git History Search",
    description:
      "Ask your repository questions in English and get cited commits, PRs, and issues in seconds.",
    type: "website",
    url: "/",
    siteName: "Git History Search"
  },
  twitter: {
    card: "summary_large_image",
    title: "Git History Search",
    description:
      "Find all commits that touched auth, rate limiting, or any subsystem using natural language."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${monoFont.variable}`}>
      <body className="min-h-screen bg-[#0d1117] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
