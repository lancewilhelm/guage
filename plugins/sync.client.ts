export default defineNuxtPlugin(async () => {
  if (import.meta.server) return;

  const syncStore = useSyncStore();

  syncStore.sync();

  window.addEventListener("focus", () => {
    syncStore.sync();
  });
});
