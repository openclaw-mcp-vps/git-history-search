import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://git-history-search.app"),
  title: {
    default: "Git History Search",
    template: "%s | Git History Search",
  },
  description:
    "Natural-language search across GitHub commits, pull requests, and issues. Find historical context for bugs, auth flow changes, and incident timelines in seconds.",
  openGraph: {
    title: "Git History Search",
    description:
      "Ask plain-English questions about repository history and get ranked commit/PR/issue evidence.",
    url: "/",
    siteName: "Git History Search",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Git History Search",
    description:
      "AI-powered semantic search over git history for onboarding and incident debugging.",
  },
  robots: {
    index: true,
    follow: true,
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
      className={`dark ${headingFont.variable} ${monoFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[#0d1117] text-zinc-100">{children}</body>
    </html>
  );
}
