import { useState, useEffect, useRef } from "react";
import CheckIcon from "@/components/Icon/Check";
import XMarkIcon from "@/components/Icon/XMark";

export default function InputElement({
  type,
  title,
  value,
  onSave,
  autoSave = true,
  debounceTime = 500,
}: {
  type: string;
  title: string;
  value: string | number | undefined;
  onSave: () => void;
  autoSave?: boolean;
  debounceTime?: number;
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
        onSave();
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
    <div>
      <div>{title}</div>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={newValue}
          onChange={handleChange}
          className="w-[250px] border border-(--main-color) p-1 rounded"
        />
        {!autoSave && newValue !== value && (
          <div className="flex gap-2">
            <CheckIcon
              fill="var(--accept-color)"
              onClick={() => {
                onSave();
                setNewValue(value);
              }}
              className="cursor-pointer"
            />
            <XMarkIcon
              fill="var(--cancel-color)"
              onClick={() => setNewValue(value)}
              className="cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
