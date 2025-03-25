import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logger } from "@/utils/logger";
import { useSessionStore } from "./sessionStore";

export interface UserSettings {
  restoreLastChat: boolean;
}

export interface AdminSettings {
  defaultModel: string;
}

export interface SettingsState {
  user: UserSettings;
  admin: AdminSettings;
}

export type SettingKey =
  | { scope: "user"; key: keyof UserSettings }
  | { scope: "admin"; key: keyof AdminSettings };

export type SettingValue<T extends SettingKey> = T extends {
  scope: "user";
  key: infer K;
}
  ? K extends keyof UserSettings
    ? UserSettings[K]
    : never
  : T extends { scope: "admin"; key: infer K }
    ? K extends keyof AdminSettings
      ? AdminSettings[K]
      : never
    : never;

export interface SettingsStore extends SettingsState {
  // Unified settings update function
  updateSetting: <T extends SettingKey>(
    scope: T["scope"],
    key: T["key"],
    value: SettingValue<T>,
  ) => void;

  // Reset functions
  resetUserSettings: () => void;
  resetAdminSettings: () => void;
  resetAllSettings: () => void;
}

const DEFAULT_USER_SETTINGS: UserSettings = {
  restoreLastChat: true,
};

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  defaultModel: "gpt-4o-mini",
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Initial state
      user: { ...DEFAULT_USER_SETTINGS },
      admin: { ...DEFAULT_ADMIN_SETTINGS },

      // Unified settings update function
      updateSetting: <T extends SettingKey>(
        scope: T["scope"],
        key: T["key"],
        value: SettingValue<T>,
      ) =>
        set((state) => {
          // Admin permission check for admin settings
          if (
            scope === "admin" &&
            useSessionStore.getState().session?.user.role !== "admin"
          ) {
            logger.warn(
              "Attempted to change admin settings without admin privileges",
            );
            return state;
          }

          return {
            [scope]: {
              ...state[scope],
              [key]: value,
            },
          };
        }),

      // Reset functions
      resetUserSettings: () => set({ user: { ...DEFAULT_USER_SETTINGS } }),
      resetAdminSettings: () => set({ admin: { ...DEFAULT_ADMIN_SETTINGS } }),
      resetAllSettings: () =>
        set({
          user: { ...DEFAULT_USER_SETTINGS },
          admin: { ...DEFAULT_ADMIN_SETTINGS },
        }),
    }),
    {
      name: "settings-store", // key in localStorage
      partialize: (state) => ({
        user: state.user,
        ...(useSessionStore.getState().session?.user.role === "admin"
          ? { admin: state.admin }
          : {}),
      }),
    },
  ),
);
