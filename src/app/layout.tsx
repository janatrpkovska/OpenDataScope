import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4";
import "./globals.css";
import { AppHeader } from "@/components/shell/AppHeader";
import { AppFooter } from "@/components/shell/AppFooter";
import { SourceProvider } from "@/components/source/SourceProvider";
import { HashAnchorFix } from "@/components/shell/HashAnchorFix";
import { data } from "@/data";
import { PAGES } from "@/content/pages";
import { AUTHOR_LINE } from "@/content/copy";

export const metadata: Metadata = {
  title: PAGES.overview.title,
  description: PAGES.overview.description,
  authors: [{ name: AUTHOR_LINE }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f9fc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        <SourceProvider>
          <AppHeader />
          <main id="content" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <AppFooter snapshot={data.snapshot} />
        </SourceProvider>
        <HashAnchorFix />
      </body>
    </html>
  );
}
