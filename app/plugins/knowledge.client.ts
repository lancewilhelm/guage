export default defineNuxtPlugin(async () => {
  if (import.meta.server) return;

  const knowledgeStore = useKnowledgeStore();

  knowledgeStore.fetchKnowledge();
});
