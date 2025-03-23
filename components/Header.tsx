"use client";
import ModeMenu from "@/components/ModeMenu";
import GlobalMenu from "@/components/GlobalMenu";
import TableListIcon from "@/components/Icon/TableList";
import PlusIcon from "@/components/Icon/Plus";

export default function Header({
  className,
  isChatsButtonVisible = false,
  toggleChatsPanel,
  createChat,
}: {
  className?: string;
  isChatsButtonVisible?: boolean;
  toggleChatsPanel?: () => void;
  createChat?: () => void;
}) {
  return (
    <div
      className={`flex justify-between py-2 px-4 items-center gap-4 ${className}`}
    >
      <div className="flex gap-4 items-center">
        {isChatsButtonVisible && (
          <div className="flex gap-4">
            <TableListIcon
              fill="var(--color-acc)"
              className="cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (toggleChatsPanel) toggleChatsPanel();
              }}
            />
            <PlusIcon
              fill="var(--color-acc)"
              className="cursor-pointer"
              onClick={createChat}
            />
          </div>
        )}
        <ModeMenu />
      </div>
      <GlobalMenu />
    </div>
  );
}
