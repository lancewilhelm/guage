export function getModelProviderIcon(provider?: string) {
  if (!provider) return "";
  const modelIcons: { [key: string]: string } = {
    ollama: "simple-icons:ollama",
    claude: "simple-icons:claude",
    gemini: "simple-icons:googlegemini",
    openai: "simple-icons:openai",
    anthropic: "simple-icons:anthropic",
    lmstudio: "local:lmstudio",
    cerebras: "local:cerebras",
  };
  return modelIcons[provider] || "";
}
