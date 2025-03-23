import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import InputElement from "@/components/Settings/InputElement";
import { nukeLocalDb } from "@/utils/db/localDb";
import { useChatStore } from "@/store/chatStore";
import { logger } from "@/utils/logger";

async function nukeCloudDb() {
  const response = await fetch("/api/nuke");
  if (response.ok) {
    logger.debug("Nuked cloud db");
  } else {
    logger.error("Failed to nuke cloud db");
  }
}

export default function ProfilePage() {
  const { session } = useSessionStore();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { resetChatStore } = useChatStore();
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
      <div className="flex flex-col gap-2">
        <div>Change Password</div>
        <input
          type="text"
          value={newPassword}
          placeholder="new password"
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-[250px] border border-(--color-bg2) p-1 rounded"
        />
        <input
          type="text"
          value={confirmPassword}
          placeholder="confirm password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-[250px] border border-(--color-bg2) p-1 rounded"
        />
        <button
          onClick={() => console.log("Save")}
          className="w-min bg-(--color-acc) text-(--color-bg2) p-1 rounded cursor-pointer hover:opacity-80 active:opacity-60"
        >
          Save
        </button>
      </div>
      <div className="flex flex-col gap-2">
        Nuke Data:
        <button
          onClick={() => {
            if (confirm("Are you sure you want to nuke your data?")) {
              nukeLocalDb();
              nukeCloudDb();
              resetChatStore();
              window.location.reload();
            }
          }}
          className="w-min bg-(--color-no) text-(--color-fg2) px-4 py-2 font-bold rounded cursor-pointer hover:opacity-80 active:opacity-60"
        >
          Nuke
        </button>
      </div>
    </div>
  );
}
