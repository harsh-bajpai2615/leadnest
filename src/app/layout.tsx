import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeadNest — Lead Management",
  description:
    "A small, opinionated lead-management app: capture, assign, and move leads through a pipeline with a full activity trail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex-1 flex flex-col">{children}</div>
        {/* Required attribution for the Digital Heroes task. */}
        <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--muted)]">
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Built for Digital Heroes Training Task
          </a>
        </footer>
      </body>
    </html>
  );
}
