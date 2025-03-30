// import { updateFavicon } from "./favicon";

/**
 * Load the CSS file for the theme
 */
export default function loadThemeCSS(themeName: string) {
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

/**
 * Remove the theme CSS file
 */
export function removeThemeCSS() {
  const existingThemeLink: HTMLLinkElement | null =
    document.querySelector("#currentTheme");
  if (existingThemeLink) {
    existingThemeLink.parentNode?.removeChild(existingThemeLink);
  }
}
