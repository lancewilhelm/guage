import { useEffect, useState } from "react";

export default function DatabasePage() {
  const [stats, setStats] = useState<{
    chatCount: number;
    messageCount: number;
  }>();

  const getStats = async () => {
    const res = await fetch("/api/stats");
    const data = await res.json();
    return data;
  };

  useEffect(() => {
    getStats().then((data) => setStats(data));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 justify-center items-center">
        <div className="flex gap-4">
          <div className="flex flex-col gap-1 items-center">
            <div className="text-5xl">{stats?.chatCount ?? 0}</div>
            <div className="text-lg">Chats</div>
          </div>
          <div className="flex flex-col gap-1 items-center">
            <div className="text-5xl">{stats?.messageCount ?? 0}</div>
            <div className="text-lg">Messages</div>
          </div>
        </div>
        <button
          onClick={() => getStats().then((data) => setStats(data))}
          className="w-min text-nowrap p-2 bg-(--main-color) text-(--bg-color) cursor-pointer hover:opacity-80 active:opacity-60 rounded-md"
        >
          Refresh Stats
        </button>
      </div>
    </div>
  );
}
