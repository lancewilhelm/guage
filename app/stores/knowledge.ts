import type { SelectKnowledge } from "~/utils/db/schema";

export const useKnowledgeStore = defineStore("knowledge", () => {
  const knowledge = ref<Record<string, KnowledgeState>>({});
  const isLoading = ref(true);

  function updateKnowledge(
    id: string,
    name: string,
    provider: string,
    createdAt: Date,
    updatedAt: Date,
    documents: number,
    chunks: number,
  ) {
    knowledge.value[id] = {
      id,
      name,
      provider,
      createdAt,
      updatedAt,
      documents,
      chunks,
    };
  }

  async function fetchKnowledge() {
    const { dbs } = await $fetch<{ dbs: SelectKnowledge[] }>("/api/knowledge");
    for (const db of dbs) {
      const { id, name, provider, createdAt, updatedAt, documents, chunks } =
        db;
      updateKnowledge(
        id,
        name,
        provider,
        createdAt,
        updatedAt,
        documents,
        chunks,
      );
    }

    // Check if user activeKnowledge is in the knowledge store
    const { settings, updateSettings } = useUserSettingsStore();
    const activeKnowledge = settings.activeKnowledge;
    if (activeKnowledge && !knowledge.value[activeKnowledge]) {
      updateSettings({ activeKnowledge: undefined });
    }

    // Set loading to false
    isLoading.value = false;
  }

  async function deleteKnowledge(id: string, name: string) {
    const { success } = await $fetch<{ success: boolean }>("/api/knowledge", {
      method: "DELETE",
      body: {
        id,
        name,
      },
    });

    if (success) {
      const { [id]: _, ...rest } = knowledge.value;
      knowledge.value = rest;
    }
  }

  return {
    isLoading,
    knowledge,
    updateKnowledge,
    fetchKnowledge,
    deleteKnowledge,
  };
});

export interface KnowledgeState {
  id: string;
  name: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
  documents: number;
  chunks: number;
}
