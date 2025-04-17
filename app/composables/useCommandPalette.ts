import fuzzysort from "fuzzysort";
import themesList from "~/assets/json/themes.json";

interface Theme {
  name: string;
  bgColor: string;
  mainColor: string;
  subColor: string;
  textColor: string;
}

export interface Option {
  label: string;
  icon?: string;
  action?: () => void;
  options?: Option[];
}

export function useCommandPalette() {
  const isOpen = ref(false);
  const query = ref("");
  const selectedOption = ref<Option>();
  const highlightedIndex = ref(0);
  const rowRefs = ref<HTMLElement[]>([]);
  const inputRef = ref<HTMLInputElement | null>(null);
  const optionsRef = ref<HTMLDivElement | null>(null);

  const sortedThemesList = [...themesList].sort((a: Theme, b: Theme) =>
    a.name.localeCompare(b.name),
  );
  const allThemes = computed<Theme[]>(() => sortedThemesList);

  const options = ref<Option[]>([
    { label: "theme", icon: "lucide:palette" },
    {
      label: "add current theme to favorites",
      icon: "fa6-solid:star",
      action: addCurrentThemeToFavorites,
    },
    {
      label: "message display mode",
      icon: "lucide:message-square-text",
      options: [
        { label: "markdown", action: () => setDisplayMode("markdown") },
        { label: "plaintext", action: () => setDisplayMode("plaintext") },
        { label: "monospace", action: () => setDisplayMode("monospace") },
      ],
    },
    {
      label: "new chat",
      icon: "lucide:message-square-plus",
      action: goToNewChat,
    },
    {
      label: "log out",
      icon: "lucide:log-out",
      action: () => useAuth().signOut(),
    },
  ]);

  const filteredOptions = computed<Option[]>(() => {
    const list = selectedOption.value?.options ?? options.value;
    if (!query.value) return list;
    return fuzzysort.go(query.value, list, { key: "label" }).map((r) => r.obj);
  });

  const filteredThemes = computed<Theme[]>(() => {
    if (!query.value) return allThemes.value;
    return fuzzysort
      .go(query.value, allThemes.value, { key: "name" })
      .map((r) => r.obj);
  });

  function closePalette() {
    isOpen.value = false;
    selectedOption.value = undefined;
    query.value = "";
    highlightedIndex.value = 0;
  }

  function selectOption(option?: Option) {
    if (!option) return;

    if (option.action) {
      option.action();
      closePalette();
    } else if (option.options) {
      selectedOption.value = option;
      query.value = "";
    } else if (option.label === "theme") {
      selectedOption.value = option;
      query.value = "";
    }
  }

  function selectTheme(theme?: Theme) {
    const userSettingsStore = useUserSettingsStore();
    if (!theme) return;
    userSettingsStore.updateSettings({ theme: theme.name });
    closePalette();
  }

  function handleInputKeydown(event: KeyboardEvent) {
    if (selectedOption.value?.label === "theme") {
      // This branch is for Theme selection
      const themes = filteredThemes.value;
      if (themes.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        highlightedIndex.value = (highlightedIndex.value + 1) % themes.length;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        highlightedIndex.value =
          (highlightedIndex.value - 1 + themes.length) % themes.length;
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (
          highlightedIndex.value >= 0 &&
          highlightedIndex.value < themes.length
        ) {
          selectTheme(themes[highlightedIndex.value]); // type: Theme
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        selectedOption.value = undefined;
        query.value = "";
        highlightedIndex.value = 0;
      }
    } else {
      // This branch is for Option selection
      const opts = filteredOptions.value;
      if (opts.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        highlightedIndex.value = (highlightedIndex.value + 1) % opts.length;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        highlightedIndex.value =
          (highlightedIndex.value - 1 + opts.length) % opts.length;
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (
          highlightedIndex.value >= 0 &&
          highlightedIndex.value < opts.length
        ) {
          selectOption(opts[highlightedIndex.value]); // type: Option
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (selectedOption.value) {
          selectedOption.value = undefined;
          query.value = "";
          highlightedIndex.value = 0;
        } else {
          isOpen.value = false;
        }
      }
    }
  }

  function setOptionRef(el: Element | null, i: number) {
    if (el) rowRefs.value[i] = el as HTMLElement;
  }

  function scrollToHighlighted() {
    const container = optionsRef.value;
    const el = rowRefs.value[highlightedIndex.value];
    if (!container || !el) return;

    const headerHeight = 48; // px (from h-12 utility)
    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;

    const visibleTop = container.scrollTop + headerHeight;
    const visibleBottom = container.scrollTop + container.clientHeight;

    if (elTop < visibleTop) container.scrollTop = elTop - headerHeight;
    else if (elBottom > visibleBottom)
      container.scrollTop = elBottom - container.clientHeight;
  }

  function scrollToCurrentThemeIfOpen() {
    const userSettingsStore = useUserSettingsStore();
    if (selectedOption.value?.label !== "theme") return;
    const currentTheme = userSettingsStore.settings.theme;
    const idx = filteredThemes.value.findIndex((t) => t.name === currentTheme);
    if (idx !== -1) {
      highlightedIndex.value = idx;
      nextTick(scrollToHighlighted);
    }
  }

  // --- Listeners & Watchers
  watch([filteredOptions, filteredThemes, isOpen, selectedOption], () => {
    rowRefs.value = [];
  });

  watch(highlightedIndex, () => nextTick(scrollToHighlighted));

  watch(
    () => selectedOption.value?.label,
    (label) => {
      if (label === "theme") scrollToCurrentThemeIfOpen();
    },
  );

  watch([filteredOptions, isOpen, query], ([options, open, q]) => {
    if (!open) highlightedIndex.value = 0;
    else if (
      q.length > 0 &&
      (options.length > 0 || filteredThemes.value.length > 0)
    )
      highlightedIndex.value = 0;
    else highlightedIndex.value = -1;
  });

  return {
    isOpen,
    query,
    selectedOption,
    highlightedIndex,
    rowRefs,
    inputRef,
    optionsRef,
    options,
    filteredOptions,
    filteredThemes,
    closePalette,
    selectOption,
    selectTheme,
    handleInputKeydown,
    setOptionRef,
    scrollToHighlighted,
    scrollToCurrentThemeIfOpen,
  };
}

function setDisplayMode(mode: "markdown" | "plaintext" | "monospace") {
  const userSettingsStore = useUserSettingsStore();
  userSettingsStore.updateSettings({ messageDisplayMode: mode });
}

function addCurrentThemeToFavorites() {
  const userSettingsStore = useUserSettingsStore();
  const settings = userSettingsStore.settings;
  if (!settings.theme) return;
  if (settings.favoriteThemes?.includes(settings.theme)) return;

  userSettingsStore.updateSettings({
    favoriteThemes: [...(settings.favoriteThemes || []), settings.theme],
  });
}

function goToNewChat() {
  navigateTo("/chat");
}
