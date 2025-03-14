"use client";
import ModeMenu from "@/components/ModeMenu";
import GlobalMenu from "@/components/GlobalMenu";
import TableListIcon from "@/components/Icon/TableList";

export default function Header({
  isSessionButtonVisible = false,
  toggleSessionPanel,
}: {
  isSessionButtonVisible?: boolean;
  toggleSessionPanel?: () => void;
}) {
  return (
    <div className="flex justify-between py-2 px-4 items-center gap-4">
      <div className="flex gap-4 items-center">
        {isSessionButtonVisible && (
          <TableListIcon
            fill="var(--main-color)"
            className="cursor-pointer"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (toggleSessionPanel) toggleSessionPanel();
            }}
          />
        )}
        <ModeMenu />
      </div>
      <GlobalMenu />
    </div>
  );
}
