interface InputRowProps {
  submitHandler: () => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading?: boolean;
  buttonLabel?: string;
  disabled?: boolean;
}

export default function InputRow({
  submitHandler,
  inputValue,
  setInputValue,
  isLoading = false,
  buttonLabel = "submit",
  disabled = false,
}: InputRowProps) {
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
        className={`border bg-(--text-color) text-(--bg-color) rounded-lg flex items-center p-2  ${isLoading || !inputValue.trim() ? "cursor-default opacity-60" : "cursor-pointer hover:opacity-80 active:opacity-60"}`}
        onClick={() => {
          if (!isLoading || inputValue.trim()) {
            submitHandler();
          }
        }}
      >
        {buttonLabel}
      </div>
    </div>
  );
}
