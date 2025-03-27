import Link from "next/link";

const sessions = [
  { id: 1, name: "test1" },
  { id: 2, name: "test2" },
  { id: 3, name: "test3" },
];
export default function Chat() {
  return (
    <div className="flex flex-col">
      <Link href="/chat" className="text-xl">
        Chat
      </Link>
      <div className="flex gap-4 w-full border border-(--main-color) rounded p-4">
        <div className="flex items-center justify-center border p-2 rounded text-xl">
          New Chat
        </div>
        <div>
          <div>Recent Sessions</div>
          <div>
            {sessions.map((session) => (
              <div key={session.id}>{session.name}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
