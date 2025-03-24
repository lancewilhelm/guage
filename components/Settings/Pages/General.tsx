import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import InputElement from "@/components/Settings/InputElement";
import { nukeLocalDb, resetSyncStatus } from "@/utils/db/localDb";
import { useChatStore } from "@/store/chatStore";
import { logger } from "@/utils/logger";
import RefreshIcon from "@/components/Icon/Refresh";
import UpArrowIcon from "@/components/Icon/UpArrow";
import FloppyDiskIcon from "@/components/Icon/FloppyDisk";
import SkullCrossbonesIcon from "@/components/Icon/SkullCrossbones";
import { useSyncStore } from "@/store/syncStore";

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

  const { sync, lastSyncTime } = useSyncStore();

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
          type="password"
          value={newPassword}
          placeholder="new password"
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-[250px] border border-(--color-bg2) p-1 rounded"
        />
        <input
          type="password"
          value={confirmPassword}
          placeholder="confirm password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-[250px] border border-(--color-bg2) p-1 rounded"
        />
        <button
          onClick={() => console.log("Save")}
          className="flex items-center gap-2 w-min bg-(--color-acc) text-(--color-bg2) p-2 rounded cursor-pointer hover:opacity-80 active:opacity-60"
        >
          <FloppyDiskIcon fill="var(--color-bg2)" /> Save
        </button>
      </div>
      <hr />
      <div className="flex flex-col gap-2">
        <div className="font-bold">Sync:</div>
        <div className="font-thin">
          Last synced at{" "}
          {lastSyncTime && new Date(lastSyncTime).toLocaleTimeString()}
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("lastSync");
            sync();
          }}
          className="flex items-center gap-2 w-min text-nowrap bg-(--color-acc) text-(--color-bg2) p-2 rounded cursor-pointer hover:opacity-80 active:opacity-60"
        >
          <RefreshIcon fill="var(--color-bg2)" className="scale-125" /> Sync
          with Cloud
        </button>
        <div className="italic">
          Sync with the cloud. Used if you are missing data from another device.
        </div>
      </div>
      <hr className="border-(--color-bg2)" />
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            localStorage.removeItem("lastSync");
            resetSyncStatus();
            sync();
          }}
          className="flex items-center gap-2 w-min text-nowrap bg-(--color-no) text-(--color-fg2) p-2 rounded cursor-pointer hover:opacity-80 active:opacity-60"
        >
          <UpArrowIcon fill="var(--color-fg2)" /> Force Push
        </button>
        <div className="italic">
          Resets the synced status of all chats and messages to unsynced and
          then performs a sync
        </div>
      </div>
      <hr />
      <div className="flex flex-col gap-2">
        <div className="font-bold">Nuke Data:</div>
        <div>Permantly erases all data from your browser and the cloud.</div>
        <button
          onClick={() => {
            if (confirm("Are you sure you want to nuke your data?")) {
              nukeLocalDb();
              nukeCloudDb();
              resetChatStore();
              window.location.reload();
            }
          }}
          className="flex items-center gap-2 w-min bg-(--color-no) text-(--color-fg2) p-2 rounded cursor-pointer hover:opacity-80 active:opacity-60"
        >
          <SkullCrossbonesIcon fill="var(--color-fg2)" />
          Nuke
        </button>
      </div>
    </div>
  );
}
