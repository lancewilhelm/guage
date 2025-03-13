import { redirect } from "next/navigation";
import { getSession } from "@/utils/auth";
import { ebGaramond } from "@/utils/fonts";

export default async function Home() {
  // check login status
  const session = await getSession();
  if (!session) {
    redirect("/login");
  } else {
    redirect("/dashboard");
  }

  return (
    <div className="homeGrid">
      <div
        className={`flex flex-col items-center justify-center row-start-[content-start] col-start-[content-start]`}
      >
        <div
          className={`text-7xl ${ebGaramond.className} mb-6 text-(--main-color)`}
        >
          Guage
        </div>
      </div>
    </div>
  );
}
