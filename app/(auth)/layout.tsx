import { redirect } from "next/navigation";
import { getSession } from "@/utils/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // check login status
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <div className="h-dvh overflow-hidden">{children}</div>;
}
