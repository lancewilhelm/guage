import { useRouter, usePathname } from "next/navigation";
import AngleDownIcon from "@/components/Icon/AngleDown";
import DropDownMenu, {
  DropDownMenuButton,
  DropDownMenuItem,
  DropDownMenuList,
} from "@/components/DropDownMenu";

const routes = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/chat", label: "Chat" },
  { path: "/roleplay", label: "Role Play" },
];

export default function ModeMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const currentRoute = routes.find((route) => route.path === pathname);

  const handleRouteChange = (path: string) => {
    router.push(path);
  };

  return (
    <DropDownMenu>
      <DropDownMenuButton>
        <div className="flex items-center gap-2">
          {currentRoute ? currentRoute.label : "Select a page"}
          <AngleDownIcon fill="var(--main-color)" />
        </div>
      </DropDownMenuButton>
      <DropDownMenuList>
        {routes
          .filter((route) => route.path !== pathname)
          .map((route, index) => (
            <DropDownMenuItem
              key={index}
              onClick={() => handleRouteChange(route.path)}
            >
              {route.label}
            </DropDownMenuItem>
          ))}
      </DropDownMenuList>
    </DropDownMenu>
  );
}
