import { redirect } from "next/navigation";
import { getSession } from "@/utils/auth";
import { cloudDb } from "@/utils/db/cloud";
import { usersTable } from "@/utils/db/schema";
import { count } from "drizzle-orm";

export default async function Home() {
  // check login status
  const session = await getSession();
  if (!session) {
    // check if there is a user in the database
    const users = await cloudDb.select({ count: count() }).from(usersTable);
    if (users[0].count === 0) {
      // no users, redirect to signup
      redirect("/register");
    }

    redirect("/login");
  } else {
    redirect("/chat");
  }
}
