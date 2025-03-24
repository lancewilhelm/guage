import { redirect } from "next/navigation";
import { getSession } from "@/utils/auth";
import SessionProvider from "@/components/SessionProvider";

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

  return (
    <SessionProvider session={session}>
      <div className="h-dvh overflow-hidden">{children}</div>
    </SessionProvider>
  );
}
