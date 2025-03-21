"use client";
import { ebGaramond } from "@/utils/fonts";
import Chat from "@/components/Dashboard/Cards/Chat";
import Header from "@/components/Header";
import { useSessionStore } from "@/store/sessionStore";

export default function Dashboard() {
  const { session } = useSessionStore();
  return (
    <div className="flex flex-col h-full">
      <Header className="col-span-3" />
      <div className="flex flex-col flex-grow max-w-[1500px] gap-10 col-start-2 items-center justify-center self-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-2xl font-extralight">Welcome</div>
          <div className={`text-6xl ${ebGaramond.className}`}>
            {session?.user.name ? session.user.name : "User"}
          </div>
        </div>
        <div id="cards" className="flex flex-wrap justify-center gap-4">
          <Chat />
          <div>Role-Play</div>
        </div>
      </div>
    </div>
  );
}
