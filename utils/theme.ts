/**
 * Loads the CSS file for the specified theme.
 * @param themeName - The name of the theme to load.
 * @returns
 */
export function loadTheme(themeName: string) {
  const existingThemeLink: HTMLLinkElement | null =
    document.querySelector("#currentTheme");
  if (existingThemeLink) {
    existingThemeLink.href = "/css/themes/" + themeName + ".css";
  } else {
    const linkElement = document.createElement("link");
    linkElement.id = "currentTheme";
    linkElement.type = "text/css";
    linkElement.rel = "stylesheet";
    linkElement.href = "/css/themes/" + themeName + ".css";
    document.head.appendChild(linkElement);
  }

  // updateFavicon(themeName);
}
