import { useState } from "react";
import AngleDownIcon from "@/components/Icon/AngleDown";

export default function DropDownElement({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div>{title}</div>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>{value}</div>
        <AngleDownIcon fill="var(--color-fg2)" />
      </div>
      {isOpen && (
        <div className="flex flex-col gap-2">
          {options.map((option) => {
            if (option !== value) {
              return (
                <div
                  key={option}
                  className={`cursor-pointer hover:opacity-80 active:opacity-60 rounded p-1 ${value === option && "bg-(--color-bg2)"}`}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                >
                  {option}
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
