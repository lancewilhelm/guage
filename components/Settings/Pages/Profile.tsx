import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import InputElement from "@/components/Settings/InputElement";

export default function ProfilePage() {
  const { session } = useSessionStore();
  const [newPassword, setNewPassword] = useState("");
  console.log(session);

  return (
    <div className="flex flex-col gap-2">
      <InputElement
        type="text"
        title="Name"
        value={session?.user.name === null ? "" : session?.user.name}
        onSave={() => console.log("Save")}
        autoSave={false}
      />
      <InputElement
        type="text"
        title="Email"
        value={session?.user.email}
        onSave={() => console.log("Save")}
      />
      <div>
        <div>Change Password</div>
        <input
          type="text"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-[250px] border border-(--color-bg2) p-1 rounded"
        />
      </div>
    </div>
  );
}
