import { useState } from "react";
import { useRouter } from "next/navigation";
import MenuIcon from "@/components/Icon/Menu";
import DropDownMenu, {
  DropDownMenuButton,
  DropDownMenuItem,
  DropDownMenuList,
} from "@/components/DropDownMenu";
import Settings from "@/components/Settings/Main";
import { useTheme } from "@/hooks/useTheme";

export default function GlobalMenu({ className }: { className?: string }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const router = useRouter();
  const { clearTheme } = useTheme();
  const handleLogout = async () => {
    // First clear theme and local storage
    clearTheme();
    localStorage.removeItem("chat-store");
    localStorage.removeItem("user-settings");

    // Then wait a small amount of time for the effect to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await fetch("/api/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      router.push("/");
    } else {
      alert("Unable to logout");
    }
  };

  return (
    <div className={`${className}`}>
      <DropDownMenu>
        <DropDownMenuButton>
          <div className="flex items-center gap-2">
            <MenuIcon fill="var(--main-color)" />
          </div>
        </DropDownMenuButton>
        <DropDownMenuList align="right">
          <DropDownMenuItem onClick={() => setIsSettingsOpen(true)}>
            Settings
          </DropDownMenuItem>
          <DropDownMenuItem onClick={handleLogout}>Logout</DropDownMenuItem>
        </DropDownMenuList>
      </DropDownMenu>
      {isSettingsOpen && <Settings onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
