export default function Modal({
  children,
  isOpen,
  onClose,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      id="modal-overlay"
      className="fixed grid items-center justify-center z-10 left-0 top-0 w-full h-full overflow-auto bg-black/60"
      onClick={onClose}
    >
      <div id="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
