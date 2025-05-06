import type { LocalMessage, Model } from "~/utils/db/local";
import {
  fetchOpenAIModels,
  completionOpenAI,
  streamOpenAI,
} from "~~/server/utils/llm/completionOpenAi";
import {
  fetchAnthropicModels,
  completionAnthropic,
  streamAnthropic,
} from "~~/server/utils/llm/completionAnthropic";
import {
  fetchGeminiModels,
  completionGemini,
  streamGemini,
} from "~~/server/utils/llm/completionGemini";
import {
  fetchLMStudioModels,
  completionLMStudio,
  streamLMStudio,
} from "~~/server/utils/llm/completionLMStudio";
import {
  fetchOllamaModels,
  completionOllama,
  streamOllama,
} from "~~/server/utils/llm/completionOllama";

export interface LLMProvider {
  id: string;
  displayName: string;
  fetchModels: (url?: string) => Promise<{ models: Model[] }>;
  complete: (opts: {
    history: LocalMessage[];
    model: string;
    systemPrompt: string;
    url?: string;
  }) => Promise<string | null>;
  stream: (opts: {
    history: LocalMessage[];
    model: string;
    systemPrompt: string;
    url?: string;
  }) => Promise<ReadableStream>;
}

export const providers: Record<string, LLMProvider> = {
  openai: {
    id: "openai",
    displayName: "OpenAI",
    fetchModels: fetchOpenAIModels,
    complete: async ({ history, model, systemPrompt }) =>
      completionOpenAI({ history, model, systemPrompt }),
    stream: async ({ history, model, systemPrompt }) =>
      streamOpenAI({
        history,
        model,
        systemPrompt,
      }),
  },
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    fetchModels: fetchAnthropicModels,
    complete: async ({ history, model, systemPrompt }) =>
      completionAnthropic({ history, model, systemPrompt }),
    stream: async ({ history, model, systemPrompt }) =>
      streamAnthropic({
        history,
        model,
        systemPrompt,
      }),
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini",
    fetchModels: fetchGeminiModels,
    complete: async ({ history, model, systemPrompt }) =>
      completionGemini({ history, model, systemPrompt }),
    stream: async ({ history, model, systemPrompt }) =>
      streamGemini({
        history,
        model,
        systemPrompt,
      }),
  },
  lmstudio: {
    id: "lmstudio",
    displayName: "LM Studio",
    fetchModels: fetchLMStudioModels,
    complete: async ({ history, model, systemPrompt }) =>
      completionLMStudio({ history, model, systemPrompt }),
    stream: async ({ history, model, systemPrompt }) =>
      streamLMStudio({
        history,
        model,
        systemPrompt,
      }),
  },
  ollama: {
    id: "ollama",
    displayName: "Ollama",
    fetchModels: fetchOllamaModels,
    complete: async ({ history, model, systemPrompt, url }) =>
      completionOllama({ history, model, systemPrompt, url }),
    stream: async ({ history, model, systemPrompt, url }) =>
      streamOllama({
        history,
        model,
        systemPrompt,
        url,
      }),
  },
};
