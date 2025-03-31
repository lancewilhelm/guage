"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/sessionStore";
import InputElement from "@/components/Settings/InputElement";
import { dbNuke, dbResetSyncStatus } from "@/utils/db/local";
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { resetChatStore } = useChatStore();
  const { sync, lastSyncTime } = useSyncStore();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2">
      <InputElement
        title="Name"
        value={session?.user.name === null ? "" : session?.user.name}
        onSave={() => console.log("Save")}
        autoSave={false}
      />
      <InputElement
        title="Email"
        value={session?.user.email}
        onSave={() => console.log("Save")}
      />
      <div className="flex flex-col gap-2">
        <div>Change Password</div>
        <form className="flex flex-col gap-2">
          <input type="username" className="hidden" disabled />
          <input
            type="password"
            value={currentPassword}
            autoComplete="current-password"
            placeholder="current password"
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-[250px] border border-(--sub-color) p-1 rounded"
          />
          <input
            type="password"
            value={newPassword}
            autoComplete="new-password"
            placeholder="new password"
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-[250px] border border-(--sub-color) p-1 rounded"
          />
          <input
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            placeholder="confirm password"
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-[250px] border border-(--sub-color) p-1 rounded"
          />
          <button
            onClick={() => console.log("Save")}
            className="flex items-center gap-2 w-min bg-(--main-color) text-(--bg-color) p-2 rounded cursor-pointer hover:opacity-80 active:opacity-60"
          >
            <FloppyDiskIcon fill="var(--bg-color)" /> Save
          </button>
        </form>
      </div>
      <hr className="border-(--sub-color)" />
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
          className="flex items-center gap-2 w-min text-nowrap bg-(--main-color) text-(--bg-color) p-2 rounded cursor-pointer hover:opacity-80 active:opacity-60"
        >
          <RefreshIcon fill="var(--bg-color)" className="scale-125" /> Sync with
          Cloud
        </button>
        <div className="italic">
          Sync with the cloud. Used if you are missing data from another device.
        </div>
      </div>
      <hr className="border-(--sub-color)" />
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            localStorage.removeItem("lastSync");
            dbResetSyncStatus();
            sync();
          }}
          className="flex items-center gap-2 w-min text-nowrap bg-(--error-color) text-(--bg-color) p-2 rounded cursor-pointer hover:opacity-80 active:opacity-60"
        >
          <UpArrowIcon fill="var(--bg-color)" /> Force Push
        </button>
        <div className="italic">
          Resets the synced status of all chats and messages to unsynced and
          then performs a sync
        </div>
      </div>
      <hr className="border-(--sub-color)" />
      <div className="flex flex-col gap-2">
        <div className="font-bold">Nuke Data:</div>
        <div>Permantly erases all data from your browser and the cloud.</div>
        <button
          onClick={() => {
            if (confirm("Are you sure you want to nuke your data?")) {
              dbNuke();
              nukeCloudDb();
              resetChatStore();
              router.push("/chat");
              // window.location.reload();
            }
          }}
          className="flex items-center gap-2 w-min bg-(--error-color) text-(--bg-color) p-2 rounded cursor-pointer hover:opacity-80 active:opacity-60"
        >
          <SkullCrossbonesIcon fill="var(--bg-color)" />
          Nuke
        </button>
      </div>
    </div>
  );
}
