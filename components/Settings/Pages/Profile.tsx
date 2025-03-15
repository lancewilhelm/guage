import { useState } from "react";
import { useSession } from "@/context/session-context";
import InputElement from "@/components/Settings/InputElement";

export default function ProfilePage() {
  const { session } = useSession();
  const [newPassword, setNewPassword] = useState("");

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
          className="w-[250px] border border-(--main-color) p-1 rounded"
        />
      </div>
    </div>
  );
}
