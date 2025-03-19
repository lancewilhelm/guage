"use client";
import ModeMenu from "@/components/ModeMenu";
import GlobalMenu from "@/components/GlobalMenu";
import TableListIcon from "@/components/Icon/TableList";
import PlusIcon from "@/components/Icon/Plus";

export default function Header({
  className,
  isSessionButtonVisible = false,
  toggleSessionPanel,
  createChatSession,
}: {
  className?: string;
  isSessionButtonVisible?: boolean;
  toggleSessionPanel?: () => void;
  createChatSession?: () => void;
}) {
  return (
    <div
      className={`flex justify-between py-2 px-4 items-center gap-4 ${className}`}
    >
      <div className="flex gap-4 items-center">
        {isSessionButtonVisible && (
          <div className="flex gap-4">
            <TableListIcon
              fill="var(--color-acc)"
              className="cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (toggleSessionPanel) toggleSessionPanel();
              }}
            />
            <PlusIcon
              fill="var(--color-acc)"
              className="cursor-pointer"
              onClick={createChatSession}
            />
          </div>
        )}
        <ModeMenu />
      </div>
      <GlobalMenu />
    </div>
  );
}
