import { useEffect, useState } from "react";
import { useGlobalSettingsStore } from "@/store/globalSettingsStore";
import OpenAIIcon from "@/components/Icon/OpenAI";
import OllamaIcon from "@/components/Icon/Ollama";

function ModelCard({ name, provider }: { name: string; provider: string }) {
  const { settings: globalSettings, updateSettings: updateGlobalSettings } =
    useGlobalSettingsStore();
  return (
    <div
      className="flex items-center gap-3 py-1 px-3 border border-(--sub-color) rounded-full "
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        updateGlobalSettings({
          availableModels: globalSettings.availableModels
            ?.map((model) => model.name)
            .includes(name)
            ? globalSettings.availableModels?.filter(
                (model) => model.name !== name,
              )
            : [...(globalSettings.availableModels ?? []), { name, provider }],
        });
      }}
    >
      <div
        className={`w-5 h-5 rounded-full border border-(--main-color) shrink-0 cursor-pointer ${globalSettings.availableModels?.map((model) => model.name).includes(name) ? "bg-(--main-color)" : "bg-(--bg-color)"}`}
      />
      <div className="text-nowrap overflow-hidden overflow-ellipsis">
        {name}
      </div>
    </div>
  );
}

export default function ModelsPage() {
  const [openAiModels, setOpenAiModels] = useState<string[]>([]);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch("/api/models");
        if (!response.ok) {
          throw new Error("Failed to fetch models");
        }
        const data = await response.json();
        setOpenAiModels(data.openaiModels);
        setOllamaModels(data.ollamaModels);
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    }

    fetchModels();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div>Select what models to make available to users to choose from.</div>
      <hr className="border-(--sub-color)" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <OpenAIIcon fill="var(--main-color)" className="scale-125" />
          <div>OpenAI</div>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
          {openAiModels
            .sort((a, b) => a.localeCompare(b))
            .map((model) => (
              <ModelCard key={model} name={model} provider="openai" />
            ))}
        </div>
      </div>
      <hr className="border-(--sub-color)" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <OllamaIcon fill="var(--main-color)" className="scale-125" />
          <div>Ollama</div>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
          {ollamaModels
            .sort((a, b) => a.localeCompare(b))
            .map((model) => (
              <ModelCard key={model} name={model} provider="ollama" />
            ))}
        </div>
      </div>
    </div>
  );
}
