export default defineNuxtPlugin(async () => {
  if (import.meta.server) return;

  const { data: session } = await authClient.useSession(useFetch);
  if (!session.value?.session) return;

  const syncStore = useSyncStore();

  syncStore.syncAll();

  window.addEventListener("focus", () => {
    syncStore.syncAll();
  });
});
