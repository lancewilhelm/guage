import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";

interface DropDownMenuContextProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

const DropDownMenuContext = createContext<DropDownMenuContextProps | undefined>(
  undefined,
);

interface DropDownMenuProps {
  children: React.ReactNode;
}

export default function DropDownMenu({ children }: DropDownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <DropDownMenuContext.Provider value={{ isOpen, setIsOpen, menuRef }}>
      <div ref={menuRef} className="relative">
        {children}
      </div>
    </DropDownMenuContext.Provider>
  );
}

export function DropDownMenuButton({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(DropDownMenuContext);
  if (!context) {
    throw new Error("DropDownMenuButton must be used within a DropDownMenu");
  }

  const { setIsOpen, isOpen } = context;

  return (
    <div
      className="cursor-pointer"
      onMouseDown={(e) => {
        e.preventDefault();
        setIsOpen(!isOpen);
      }}
    >
      {children}
    </div>
  );
}

export function DropDownMenuList({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const context = useContext(DropDownMenuContext);
  if (!context) {
    throw new Error("DropDownMenuList must be used within a DropDownMenu");
  }

  const { isOpen } = context;

  return isOpen ? (
    <div
      className={`absolute bg-(--bg-color) mt-2 border rounded min-w-max z-10 ${align === "right" ? "right-0" : "left-0"}`}
    >
      {children}
    </div>
  ) : null;
}

export function DropDownMenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  const context = useContext(DropDownMenuContext);
  if (!context) {
    throw new Error("DropDownMenuItem must be used within a DropDownMenu");
  }

  const { setIsOpen } = context;
  return (
    <div
      className="cursor-pointer bg-(--bg-color) rounded p-2 hover:opacity-80 active:opacity-60"
      onClick={() => {
        onClick();
        setIsOpen(false);
      }}
    >
      {children}
    </div>
  );
}
