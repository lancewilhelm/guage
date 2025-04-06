import { useSyncStore } from "~/stores/sync";
import { debounce } from "../debounce";

const DEBOUNCE_MS = 500;

const _triggerSync = () => {
  const sync = useSyncStore();
  if (!sync.isSyncing) {
    sync.sync();
  }
};

export const triggerDebouncedSync = debounce(_triggerSync, DEBOUNCE_MS);
