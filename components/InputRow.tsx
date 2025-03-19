import {
  useCallback,
  memo,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import StopIcon from "@/components/Icon/StopCircle";

const SubmitButton = memo(
  ({
    isStreaming,
    isLoading,
    hasInput,
    onSubmit,
    onStop,
    buttonLabel,
  }: {
    isStreaming: boolean;
    isLoading: boolean;
    hasInput: boolean;
    onSubmit: () => void;
    onStop: () => void;
    buttonLabel: string;
  }) => {
    const isDisabled = isLoading || (!hasInput && !isStreaming);
    const buttonClasses = `
    flex items-center justify-center
    border rounded-lg p-2 w-[50px]
    bg-(--text-color) text-(--bg-color)
    ${isDisabled ? "cursor-default opacity-60" : "cursor-pointer hover:opacity-80 active:opacity-60"}
  `;

    const handleClick = () => {
      if (isStreaming) {
        onStop();
      } else if (!isDisabled) {
        onSubmit();
      }
    };

    return (
      <button
        className={buttonClasses}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={isStreaming ? "Stop" : buttonLabel}
      >
        {isStreaming ? <StopIcon fill="var(--bg-color)" /> : buttonLabel}
      </button>
    );
  },
);

SubmitButton.displayName = "SubmitButton";

export interface InputRowHandle {
  setValue: (value: string) => void;
  getValue: () => string;
  focus: () => void;
  clear: () => void;
}

const InputRow = forwardRef<
  InputRowHandle,
  {
    submitHandler: () => void;
    stopHandler: () => void;
    initialValue?: string;
    isLoading?: boolean;
    isStreaming?: boolean;
    buttonLabel?: string;
    disabled?: boolean;
  }
>(function InputRow(
  {
    submitHandler,
    stopHandler,
    initialValue = "",
    isLoading = false,
    isStreaming = false,
    buttonLabel = "submit",
    disabled = false,
  },
  ref,
) {
  const [inputValue, setInputValueState] = useState(initialValue);
  const [hasInput, setHasInput] = useState(Boolean(initialValue.trim()));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      setValue: (value: string) => {
        setInputValueState(value);
        setHasInput(Boolean(value.trim()));
      },
      getValue: () => inputValue,
      focus: () => textareaRef.current?.focus(),
      clear: () => {
        setInputValueState("");
        setHasInput(false);
      },
    }),
    [inputValue],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInputValueState(newValue);
      setHasInput(Boolean(newValue.trim()));
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitHandler();
      }
    },
    [submitHandler],
  );

  return (
    <div className="col-start-2 row-start-3 flex gap-2 p-4">
      <textarea
        ref={textareaRef}
        className={`border border-(--main-color) rounded grow p-1 ${disabled ? "bg-(--sub-color)" : ""}`}
        placeholder="type a message here..."
        disabled={disabled || isLoading}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      <SubmitButton
        isStreaming={isStreaming}
        isLoading={isLoading}
        hasInput={hasInput}
        onSubmit={submitHandler}
        onStop={stopHandler}
        buttonLabel={buttonLabel}
      />
    </div>
  );
});

export default InputRow;
