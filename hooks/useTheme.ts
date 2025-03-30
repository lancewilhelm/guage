import { useState, useLayoutEffect, useRef } from "react";
import loadThemeCSS, { removeThemeCSS } from "@/utils/loadThemeCSS";
import { useUserSettingsStore } from "@/store/userSettingsStore";

const THEME_STORAGE_KEY = "theme";

export function useTheme() {
  const isFirstRender = useRef(true);
  const userSettings = useUserSettingsStore((state) => state.settings);

  const getCookieTheme = () => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(
        new RegExp("(^| )" + THEME_STORAGE_KEY + "=([^;]+)"),
      );
      return match && match[2] !== "" ? match[2] : undefined;
    }
    return undefined;
  };

  // Prioritize theme from user settings, fallback to cookie
  const getInitialTheme = () => {
    const themeFromSettings = userSettings?.selectedTheme;
    const themeFromCookie = getCookieTheme();

    return themeFromSettings || themeFromCookie;
  };

  const [currentTheme, setCurrentTheme] = useState(getInitialTheme);

  // Function to explicitly delete the theme cookie
  const deleteThemeCookie = () => {
    if (typeof document !== "undefined") {
      document.cookie = `${THEME_STORAGE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  };

  useLayoutEffect(() => {
    if (typeof document !== "undefined") {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      // Set or remove theme cookie
      if (currentTheme) {
        loadThemeCSS(currentTheme);
        document.cookie = `${THEME_STORAGE_KEY}=${currentTheme}; path=/; max-age=31536000; SameSite=Lax`; // 1 year expiry
      } else {
        deleteThemeCookie();
      }
    }
  }, [currentTheme]);

  return {
    currentTheme,
    setCurrentTheme,
    clearTheme: () => {
      setCurrentTheme(undefined);
      removeThemeCSS();
      deleteThemeCookie(); // Immediately delete cookie without waiting for effect
    },
  };
}
