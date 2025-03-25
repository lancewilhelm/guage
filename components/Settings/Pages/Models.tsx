import DropDownElement from "@/components/Settings/DropDownElement";
import { useGlobalSettingsStore } from "@/store/globalSettingsStore";

export default function ModelsPage() {
  const { settings: globalSettings, updateSettings: updateGlobalSettings } =
    useGlobalSettingsStore();

  return (
    <div className="flex flex-col gap-2">
      <DropDownElement
        title="Default Model"
        value={globalSettings.defaultModel ?? ""}
        options={["gpt-4o-mini", "gpt-4o"]}
        onChange={(value) => updateGlobalSettings({ defaultModel: value })}
      />
    </div>
  );
}
