export function getModelProviderIcon(provider?: string) {
  if (!provider) return "";
  console.log("provider", provider);
  const modelIcons: { [key: string]: string } = {
    ollama: "simple-icons:ollama",
    claude: "simple-icons:claude",
    gemini: "simple-icons:googlegemini",
    openai: "simple-icons:openai",
  };
  console.log(modelIcons[provider]);
  return modelIcons[provider] || "";
}
