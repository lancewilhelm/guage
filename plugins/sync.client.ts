export default defineNuxtPlugin(() => {
  const syncStore = useSyncStore();

  syncStore.syncAll();

  window.addEventListener("focus", () => {
    syncStore.syncAll();
  });
});
