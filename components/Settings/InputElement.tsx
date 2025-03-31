import { useState, useEffect, useRef } from "react";
import CheckIcon from "@/components/Icon/Check";
import XMarkIcon from "@/components/Icon/XMark";

export default function InputElement({
  title,
  value,
  onSave,
  autoSave = true,
  debounceTime = 500,
  className,
}: {
  title: string;
  value: string | undefined;
  onSave: (input: typeof value) => void;
  autoSave?: boolean;
  debounceTime?: number;
  className?: string;
}) {
  const [newValue, setNewValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewValue(e.target.value);

    if (autoSave && onSave) {
      // Clear existing timeouts
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set a new timeout
      debounceTimerRef.current = setTimeout(() => {
        if (!value) return;
        onSave(value);
      }, debounceTime);
    }
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`${className}`}>
      <div>{title}</div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newValue}
          onChange={handleChange}
          className="w-[250px] border border-(--sub-color) p-1 rounded"
        />
        {!autoSave && newValue !== value && (
          <div className="flex gap-2">
            <CheckIcon
              fill="var(--color-yes)"
              onClick={() => {
                if (!value) return;
                onSave(value);
                setNewValue(value);
              }}
              className="cursor-pointer"
            />
            <XMarkIcon
              fill="var(--color-no)"
              onClick={() => setNewValue(value)}
              className="cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
