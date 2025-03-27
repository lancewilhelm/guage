import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register | Guage",
  description: "Create a new account",
  openGraph: {
    title: "Login | Guage",
    description: "Create a new account",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
