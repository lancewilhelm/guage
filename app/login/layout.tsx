import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Guage",
  description: "Login to your account",
  openGraph: {
    title: "Login | Guage",
    description: "Login to your account",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
