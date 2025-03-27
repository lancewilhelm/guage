import type { Metadata } from "next";
import { cookies } from "next/headers";
import { geist } from "@/utils/fonts";
import "./globals.css";
import "./hljs.css";

export const metadata: Metadata = {
  title: "Guage",
  description: "One-stop-shop for LLM front-end",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const theme = (await cookies()).get("theme")?.value;
  let themeHref;
  if (theme) {
    themeHref = `/css/themes/${theme}.css`;
  }

  return (
    <html lang="en">
      <head>
        {theme && (
          <link
            id="currentTheme"
            rel="stylesheet"
            type="text/css"
            href={themeHref}
          />
        )}
      </head>
      <body className={`${geist.className}`}>{children}</body>
    </html>
  );
}
