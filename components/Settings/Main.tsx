import Modal from "@/components/Modal";

export default function Settings({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="grid grid-cols-[100px_auto] bg-(--bg-color) border w-[800px] h-[800px] rounded-(--border-radius)">
        <div className="flex flex-col gap-2 border-r p-2">
          <div>Profile</div>
          <div>Models</div>
          <div>Theme</div>
        </div>
      </div>
    </Modal>
  );
}
