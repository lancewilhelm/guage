export interface GlobalSettings {
  defaultModel: string;
}

export interface GlobalSettingsState {
  settings: GlobalSettings;
  isSynced: boolean;
  updatedAt: Date;
  updateSettings: (newSettings: Partial<GlobalSettings>) => void;
  updateFromSync: (syncedData: {
    settings: GlobalSettings;
    updatedAt: Date;
  }) => void;
}

export interface UserSettings {
  darkMode: boolean;
}

export interface UserSettingsState {
  settings: UserSettings;
  updatedAt: Date;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  updateFromSync: (syncedData: {
    settings: UserSettings;
    updatedAt: Date;
  }) => void;
}

export interface AllSettings {
  user: { settings: UserSettings; updatedAt: Date };
  global: { settings: GlobalSettings; updatedAt: Date };
}
