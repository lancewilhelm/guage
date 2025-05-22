export interface ProviderMeta {
  /** must match your server-side providers.ts key */
  id: string;
  displayName: string;
  icon: string;
  needsUrl?: boolean;
}

export const providers: ProviderMeta[] = [
  { id: "openai", displayName: "OpenAI", icon: "simple-icons:openai" },
  { id: "gemini", displayName: "Gemini", icon: "simple-icons:googlegemini" },
  { id: "anthropic", displayName: "Anthropic", icon: "simple-icons:anthropic" },
  {
    id: "lmstudio",
    displayName: "LM Studio",
    icon: "local:lmstudio",
  },
  {
    id: "ollama",
    displayName: "Ollama",
    icon: "simple-icons:ollama",
  },
];
