import { debounce } from "../debounce";

const DEBOUNCE_MS = 500;

let _debouncedSync: (() => void) | null = null;

export const triggerDebouncedSync = () => {
  // Lazy initialization to avoid store access during module load
  if (!_debouncedSync) {
    const _triggerSync = () => {
      // Import store only when actually needed using dynamic import
      import("~/stores/sync").then(({ useSyncStore }) => {
        const sync = useSyncStore();
        if (!sync.isSyncing) {
          sync.sync();
        }
      });
    };

    _debouncedSync = debounce(_triggerSync, DEBOUNCE_MS);
  }

  _debouncedSync();
};
