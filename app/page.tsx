import { redirect } from "next/navigation";
import { getSession } from "@/utils/auth";

export default async function Home() {
  // check login status
  const session = await getSession();
  if (!session) {
    redirect("/login");
  } else {
    redirect("/chat");
  }
}
