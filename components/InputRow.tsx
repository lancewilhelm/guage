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
import OpenAIIcon from "@/components/Icon/OpenAI";
import OllamaIcon from "@/components/Icon/Ollama";
import { Model, useGlobalSettingsStore } from "@/store/globalSettingsStore";
import { useUserSettingsStore } from "@/store/userSettingsStore";

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

function ModelSelect({ model }: { model?: Model }) {
  const [isListOpen, setIsListOpen] = useState(false);
  const availableModels = useGlobalSettingsStore(
    (state) => state.settings.availableModels,
  );
  const { updateSettings } = useUserSettingsStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsListOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!model) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="flex items-center justify-between gap-1 cursor-pointer hover:bg-(--sub-color)/10 p-1 rounded"
        onClick={() => setIsListOpen(!isListOpen)}
      >
        {model.provider === "openai" && <OpenAIIcon fill="var(--main-color)" />}
        {model.provider === "ollama" && <OllamaIcon fill="var(--main-color)" />}
        <div className="text-sm text-(--main-color) font-mono">
          {model.name}
        </div>
        <svg
          className={`w-3 h-3 transition-transform ${isListOpen ? "" : "rotate-180"}`}
          viewBox="0 0 10 6"
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="var(--main-color)"
            fill="none"
            strokeWidth="2"
          />
        </svg>
      </div>

      {isListOpen && (
        <div className="absolute bottom-full mb-2 left-0 bg-(--bg-color) border border-(--sub-color) rounded-lg shadow-lg py-1 w-60 max-h-60 z-10">
          <div className="overflow-y-auto">
            {availableModels
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((availableModel) => (
                <div
                  key={`${availableModel.provider}-${availableModel.name}`}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-(--sub-color)/10 ${model.provider === availableModel.provider && model.name === availableModel.name ? "bg-(--sub-color)/20" : ""}`}
                  onClick={() => {
                    updateSettings({ selectedModel: availableModel });
                    setIsListOpen(false);
                  }}
                >
                  {availableModel.provider === "openai" && (
                    <OpenAIIcon fill="var(--main-color)" />
                  )}
                  {availableModel.provider === "ollama" && (
                    <OllamaIcon fill="var(--main-color)" />
                  )}
                  <span className="text-sm font-mono">
                    {availableModel.name}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
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
    if (!textarea) return;

    textarea.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);

    const maxHeight = lineHeight * 10;
    const newHeight = Math.min(maxHeight, textarea.scrollHeight);

    textarea.style.height = `${newHeight}px`;

    // Set a document variable for the input row height
    if (inputRowRef.current) {
      const inputRowHeight = inputRowRef.current.offsetHeight;
      document.documentElement.style.setProperty(
        "--input-row-height",
        `${inputRowHeight}px`,
      );
    }
  }, []);

  // Set up an event listener to update the right edge of the input box when the window is resized
  useEffect(() => {
    window.addEventListener("resize", adjustHeight);
    return () => window.removeEventListener("resize", adjustHeight);
  }, [adjustHeight]);

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
        textareaRef.current!.style.height = "auto";
        submitHandler();
      }
    },
    [submitHandler],
  );

  return (
    <div
      ref={inputRowRef}
      className="input-row flex gap-2 p-2 mx-4 border border-(--sub-color) rounded-lg mb-4 backdrop-blur-lg bg-(--bg-color)/60 shadow-md"
    >
      <div className="flex flex-col gap-2 grow items-start">
        <textarea
          ref={textareaRef}
          className={`input-box w-full p-1 resize-none focus:outline-none`}
          placeholder="Send a message..."
          disabled={disabled || isLoading}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <ModelSelect
          model={useUserSettingsStore((state) => state.settings.selectedModel)}
        />
      </div>
      <div className="flex items-center">
        <SubmitButton
          isStreaming={isStreaming}
          isLoading={isLoading}
          hasInput={hasInput}
          onSubmit={() => {
            textareaRef.current!.style.height = "auto";
            submitHandler();
          }}
          onStop={stopHandler}
        />
      </div>
    </div>
  );
});

export default InputRow;
