import {
  useEffect,
  useCallback,
  memo,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import UpArrowIcon from "@/components/Icon/UpArrow";
import SquareRoundedIcon from "@/components/Icon/SquareRounded";

const SubmitButton = memo(
  ({
    isStreaming,
    isLoading,
    hasInput,
    onSubmit,
    onStop,
  }: {
    isStreaming: boolean;
    isLoading: boolean;
    hasInput: boolean;
    onSubmit: () => void;
    onStop: () => void;
  }) => {
    const isDisabled = isLoading || (!hasInput && !isStreaming);
    const buttonClasses = `input-button flex flex-shrink-0 items-center justify-center rounded-full p-2 w-10 h-10 bg-(--main-color) text-(--bg-color) ${isDisabled ? "cursor-default opacity-60" : "cursor-pointer hover:opacity-80 active:opacity-60"}`;

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
        aria-label={isStreaming ? "Stop" : "Send"}
      >
        {isStreaming ? (
          <SquareRoundedIcon fill="var(--bg-color)" />
        ) : (
          <UpArrowIcon fill="var(--bg-color)" />
        )}
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
    disabled?: boolean;
  }
>(function InputRow(
  {
    submitHandler,
    stopHandler,
    initialValue = "",
    isLoading = false,
    isStreaming = false,
    disabled = false,
  },
  ref,
) {
  const [inputValue, setInputValueState] = useState(initialValue);
  const [hasInput, setHasInput] = useState(Boolean(initialValue.trim()));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRowRef = useRef<HTMLDivElement>(null);

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

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    const inputRow = inputRowRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);

    const maxHeight = lineHeight * 10;
    const newHeight = Math.min(maxHeight, textarea.scrollHeight);

    textarea.style.height = `${newHeight}px`;

    const inputRowHeight = inputRow?.clientHeight;
    document.documentElement.style.setProperty(
      "--input-row-height",
      `${inputRowHeight}px`,
    );
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInputValueState(newValue);
      setHasInput(Boolean(newValue.trim()));
      setTimeout(adjustHeight, 0);
    },
    [adjustHeight],
  );

  // Initialize the height of the input box
  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

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
    <div
      ref={inputRowRef}
      className="input-row col-start-2 row-start-3 flex items-center gap-2 p-2 mx-4 border-2 border-(--sub-color) rounded-xl mb-4 backdrop-blur-lg bg-(--bg-color)/60 shadow-md"
    >
      <textarea
        ref={textareaRef}
        className={`input-box rounded grow p-1 resize-none focus:outline-none`}
        placeholder="Send a message..."
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
      />
    </div>
  );
});

export default InputRow;
