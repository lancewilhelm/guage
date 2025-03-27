import { useState } from "react";
import Modal from "@/components/Modal";
import XMarkIcon from "@/components/Icon/XMark";
import GeneralPage from "@/components/Settings/Pages/General";
import ModelsPage from "@/components/Settings/Pages/Models";
import ThemePage from "@/components/Settings/Pages/Theme";
import { useSessionStore } from "@/store/sessionStore";

const settingsPages = {
  profile: { name: "General", component: <GeneralPage />, adminOnly: false },
  theme: { name: "Theme", component: <ThemePage />, adminOnly: false },
  models: { name: "Models", component: <ModelsPage />, adminOnly: true },
};

function SettingsPageListItem({
  name,
  onClick,
  isCurrentPage,
}: {
  name: string;
  onClick: () => void;
  isCurrentPage: boolean;
}) {
  return (
    <div
      className={`cursor-pointer hover:opacity-80 active:opacity-60 ${isCurrentPage && "text-(--main-color)"}`}
      onClick={onClick}
    >
      {name}
    </div>
  );
}

// Helper to check admin permissions
const isAdmin = (): boolean => {
  const session = useSessionStore.getState().session;
  if (!session) return false;
  return ["admin", "owner"].includes(session.user.role);
};

export default function Settings({ onClose }: { onClose: () => void }) {
  const [currentPage, setCurrentPage] = useState("profile");

  return (
    <Modal onClose={onClose}>
      <div className="grid grid-cols-[100px_auto] grid-rows-[min-content_auto] bg-(--bg-color) border-2 border-(--sub-color) w-[800px] max-w-[80vw] h-[800px] rounded-(--border-radius)">
        <div className="flex justify-between items-center col-span-2 p-2 border-b-2 border-(--sub-color)">
          <div className="text-(--main-color)">Settings</div>
          <XMarkIcon
            fill="var(--main-color)"
            className="cursor-pointer hover:opacity-80 active:opacity-60"
            onClick={onClose}
          />
        </div>
        <div className="flex flex-col gap-2 border-r-2 border-(--sub-color) p-2 row-start-2">
          {Object.entries(settingsPages).map(([slug, { name, adminOnly }]) => {
            if (!adminOnly || isAdmin()) {
              return (
                <SettingsPageListItem
                  key={slug}
                  name={name}
                  onClick={() => setCurrentPage(slug)}
                  isCurrentPage={slug === currentPage}
                />
              );
            }
          })}
        </div>
        <div className="flex flex-col row-start-2 p-2 overflow-y-auto">
          {settingsPages[currentPage as keyof typeof settingsPages].component}
        </div>
      </div>
    </Modal>
  );
}
