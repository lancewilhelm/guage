export function registerFocusSync() {
  const syncStore = useSyncStore();
  const handler = () => syncStore.sync();
  window.addEventListener("focus", handler);
  return () => window.removeEventListener("focus", handler);
}
