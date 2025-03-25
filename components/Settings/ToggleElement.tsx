export default function ToggleElement({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-[auto_min-content] grid-rows-2 items-center gap-1">
      <div className="row-start-1 col-start-1">{title}</div>
      <div className="row-start-2 col-start-1 italic">{description}</div>
      <div
        className={`flex col-start-2 row-span-2 w-[60px] border-2 border-(--color-bg2) rounded-full cursor-pointer  ${value ? "justify-end bg-(--color-acc)" : "justify-start"}`}
        onClick={() => onChange(!value)}
      >
        <div
          className={`w-[30px] h-[30px] border-4 rounded-full ${value ? " bg-(--color-bg0) border-(--color-acc)" : "bg-(--color-acc) border-(--color-bg0)"}`}
        />
      </div>
    </div>
  );
}
