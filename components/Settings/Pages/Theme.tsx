import { useState } from "react";
import themesList from "@/public/themes.json";
import { useTheme } from "@/hooks/useTheme";
import ColorSamplesIcon from "@/components/Icon/ColorSamples";
import AToZIcon from "@/components/Icon/AToZ";
import StarEmptyIcon from "@/components/Icon/StarEmpty";
import StarFilledIcon from "@/components/Icon/StarFilled";
import ToggleElement from "@/components/Settings/ToggleElement";
import { useUserSettingsStore } from "@/store/userSettingsStore";

type Theme = {
  name: string;
  bgColor: string;
  mainColor: string;
  subColor: string;
  textColor: string;
};

function hexToLuminance(hex: string) {
  hex = hex.replace(/#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const themes: Theme[] = JSON.parse(JSON.stringify(themesList)).sort(
  (a: Theme, b: Theme) => hexToLuminance(a.bgColor) - hexToLuminance(b.bgColor),
);

function ThemeCard({
  theme,
  onThemeSelect,
  isActiveTheme,
  isFavorite,
}: {
  theme: Theme;
  onThemeSelect: (theme: string) => void;
  isActiveTheme: boolean;
  isFavorite: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { settings: userSettings, updateSettings: updateUserSettings } =
    useUserSettingsStore();
  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto] justify-center items-center cursor-pointer px-2 rounded-full border`}
      style={
        {
          background: theme.bgColor,
          color: theme.textColor,
          borderColor: isActiveTheme ? theme.mainColor : theme.bgColor,
        } as React.CSSProperties
      }
      onMouseOver={(e) => {
        setIsHovered(true);
        e.currentTarget.style.borderColor = theme.mainColor;
      }}
      onMouseOut={(e) => {
        setIsHovered(false);
        e.currentTarget.style.borderColor = isActiveTheme
          ? theme.mainColor
          : theme.bgColor;
      }}
      onClick={() => onThemeSelect(theme.name)}
    >
      <div className="flex text-sm items-center font-bold font-mono">
        <div className={`px-2 py-1 rounded-full`}>{theme.name}</div>
      </div>
      {isFavorite ? (
        <StarFilledIcon
          fill={theme.textColor}
          className={`mr-1 ${isHovered || isFavorite ? "block" : "hidden"}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            updateUserSettings({
              favoriteThemes: userSettings.favoriteThemes.filter(
                (t) => t !== theme.name,
              ),
            });
          }}
        />
      ) : (
        <StarEmptyIcon
          fill={theme.textColor}
          className={`mr-1 ${isHovered ? "block" : "hidden"}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            updateUserSettings({
              favoriteThemes: [...userSettings.favoriteThemes, theme.name],
            });
          }}
        />
      )}
      <div
        className={`grid grid-cols-3 gap-1 items-center justify-center p-[5px]`}
      >
        <div
          className="w-4 h-4 rounded-full"
          style={{ background: theme.mainColor }}
        />
        <div
          className="w-4 h-4 rounded-full"
          style={{ background: theme.subColor }}
        />
        <div
          className="w-4 h-4 rounded-full"
          style={{ background: theme.textColor }}
        />
      </div>
    </div>
  );
}

export default function ThemePage() {
  const [sortByColor, setSortByColor] = useState(true);
  const { currentTheme, setCurrentTheme } = useTheme();
  const { settings: userSettings, updateSettings: updateUserSettings } =
    useUserSettingsStore();
  return (
    <div className="flex flex-col gap-4">
      <ToggleElement
        title="Dark Code"
        description="Turn on dark mode for code blocks"
        value={userSettings.darkCode}
        onChange={(value) => updateUserSettings({ darkCode: value })}
      />
      <div className="flex items-center gap-4">
        <div>Theme</div>
        <div className="flex gap-1">
          <div
            className={`flex items-center justify-center p-1.5 rounded-lg cursor-pointer ${sortByColor ? "bg-(--main-color)" : ""}`}
            onClick={() => setSortByColor(true)}
          >
            <ColorSamplesIcon
              fill={`${sortByColor ? "var(--bg-color)" : "var(--main-color)"}`}
              className="scale-150"
            />
          </div>
          <div
            className={`flex items-center justify-center p-1.5 rounded-lg cursor-pointer ${!sortByColor ? "bg-(--main-color)" : ""}`}
            onClick={() => setSortByColor(false)}
          >
            <AToZIcon
              fill={`${!sortByColor ? "var(--bg-color)" : "var(--main-color)"}`}
              className="scale-150"
            />
          </div>
        </div>
      </div>
      <div>
        <div className="mb-2">Favorites</div>
        <div className="grid grid-cols-2 gap-2">
          {(sortByColor
            ? themes
                .filter((theme) =>
                  userSettings.favoriteThemes?.includes(theme.name),
                )
                .sort(
                  (a, b) =>
                    hexToLuminance(a.bgColor) - hexToLuminance(b.bgColor),
                )
            : themes
                .filter((theme) =>
                  userSettings.favoriteThemes?.includes(theme.name),
                )
                .sort((a, b) => a.name.localeCompare(b.name))
          ).map((theme) => (
            <ThemeCard
              key={theme.name}
              theme={theme}
              onThemeSelect={(theme) => setCurrentTheme(theme)}
              isActiveTheme={theme.name === currentTheme}
              isFavorite={true}
            />
          ))}
        </div>
      </div>
      <hr className="border-(--sub-color)" />
      <div className="grid grid-cols-2 gap-2">
        {(sortByColor
          ? themes
              .filter(
                (theme) => !userSettings.favoriteThemes?.includes(theme.name),
              )
              .sort(
                (a, b) => hexToLuminance(a.bgColor) - hexToLuminance(b.bgColor),
              )
          : themes
              .filter(
                (theme) => !userSettings.favoriteThemes?.includes(theme.name),
              )
              .sort((a, b) => a.name.localeCompare(b.name))
        ).map((theme) => (
          <ThemeCard
            key={theme.name}
            theme={theme}
            onThemeSelect={(theme) => setCurrentTheme(theme)}
            isActiveTheme={theme.name === currentTheme}
            isFavorite={false}
          />
        ))}
      </div>
    </div>
  );
}
