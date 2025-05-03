import type { SelectKnowledge } from "~/utils/db/schema";

export const useKnowledgeStore = defineStore("knowledge", () => {
  const knowledge = ref<Record<string, KnowledgeState>>({});

  function createKnowledge(
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
      details: {
        documents,
        chunks,
      },
    };
  }

  async function fetchKnowledge() {
    const { dbs } = await $fetch<{ dbs: SelectKnowledge[] }>("/api/knowledge");
    for (const db of dbs) {
      const { id, name, provider, createdAt, updatedAt, details } = db;
      createKnowledge(
        id,
        name,
        provider,
        createdAt,
        updatedAt,
        details.documents,
        details.chunks,
      );
    }
  }

  async function deleteKnowledge(id: string) {
    const { success } = await $fetch<{ success: boolean }>("/api/knowledge", {
      method: "DELETE",
      body: {
        id,
      },
    });

    if (success) {
      const { [id]: _, ...rest } = knowledge.value;
      knowledge.value = rest;
    }
  }

  return {
    knowledge,
    createKnowledge,
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
  details: {
    documents: number;
    chunks: number;
  };
}
