import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Guage",
  description: "Dashboard for Guage",
  openGraph: {
    title: "Dashboard | Guage",
    description: "Dashboard for Guage",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
