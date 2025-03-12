import type { Metadata } from "next";
import { geistSans } from "@/utils/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guage",
  description: "One-stop-shop for LLM front-end",
};

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.className}`}
      >
        {children}
      </body>
    </html>
  );
}
