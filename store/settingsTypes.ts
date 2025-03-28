import { UserSettings } from "./userSettingsStore";
import { GlobalSettings } from "./globalSettingsStore";

export interface AllSettings {
  user: { settings: UserSettings; updatedAt: Date };
  global: { settings: GlobalSettings; updatedAt: Date };
}
