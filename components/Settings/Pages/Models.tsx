import DropDownElement from "@/components/Settings/DropDownElement";
import { useSettingsStore } from "@/store/settingsStore";

export default function ModelsPage() {
  const { admin, updateSetting } = useSettingsStore();

  return (
    <div className="flex flex-col gap-2">
      <DropDownElement
        title="Default Model"
        value={admin.defaultModel ?? ""}
        options={["gpt-4o-mini", "gpt-4o"]}
        onChange={(value) => updateSetting("admin", "defaultModel", value)}
      />
    </div>
  );
}
