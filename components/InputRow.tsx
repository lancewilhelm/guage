import StopIcon from "@/components/Icon/StopCircle";

export default function InputRow({
  submitHandler,
  stopHandler,
  inputValue,
  setInputValue,
  isLoading = false,
  isStreaming = false,
  buttonLabel = "submit",
  disabled = false,
}: {
  submitHandler: () => void;
  stopHandler: () => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  buttonLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="col-start-2 row-start-3 flex gap-2 p-2 ">
      <textarea
        className={`border border-(--main-color) rounded grow p-1 ${disabled ? "bg-(--sub-color)" : ""}`}
        placeholder="type a message here..."
        disabled={disabled || isLoading}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitHandler();
          }
        }}
      ></textarea>
      <div
        className={`flex items-center justify-center border bg-(--text-color) text-(--bg-color) rounded-lg p-2 w-[50px]  ${isLoading || (!inputValue.trim() && !isStreaming) ? "cursor-default opacity-60" : "cursor-pointer hover:opacity-80 active:opacity-60"}`}
        onClick={() => {
          if (isStreaming) {
            stopHandler();
          } else if (!isLoading || inputValue.trim()) {
            submitHandler();
          }
        }}
      >
        {isStreaming ? <StopIcon fill="var(--bg-color)" /> : buttonLabel}
      </div>
    </div>
  );
}
