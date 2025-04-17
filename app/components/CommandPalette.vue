<script setup lang="ts">
import fuzzysort from "fuzzysort";
import themesList from "~/assets/json/themes.json";

// --- Types
interface Theme {
  name: string;
  bgColor: string;
  mainColor: string;
  subColor: string;
  textColor: string;
}

interface Option {
  label: string;
  icon?: string;
  action?: () => void;
  options?: Option[];
}

// --- Store Composables
const { signOut } = useAuth();
const userSettingsStore = useUserSettingsStore();
const uiStore = useUiStore();

// --- Theme List (sorted once)
const sortedThemesList = [...themesList].sort((a: Theme, b: Theme) =>
  a.name.localeCompare(b.name),
);
const allThemes = computed<Theme[]>(() => sortedThemesList);

// --- Command Palette Options
function addCurrentThemeToFavorites() {
  const settings = userSettingsStore.settings;
  if (!settings.theme) return;
  if (settings.favoriteThemes?.includes(settings.theme)) return;

  userSettingsStore.updateSettings({
    favoriteThemes: [...(settings.favoriteThemes || []), settings.theme],
  });
}
function setDisplayMode(mode: "markdown" | "plaintext" | "monospace") {
  userSettingsStore.updateSettings({ messageDisplayMode: mode });
}
function goToNewChat() {
  navigateTo("/chat");
}
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
  { label: "log out", icon: "lucide:log-out", action: signOut },
]);

// --- Palette State
const cpOpen = ref(false);
const query = ref("");
const selectedOption = ref<Option>();
const highlightedIndex = ref(0);
const rowRefs = ref<HTMLElement[]>([]);
const inputRef = ref<HTMLInputElement | null>(null);
const optionsRef = ref<HTMLDivElement | null>(null);

// --- Fuzzy filter
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

// --- Selection Actionstrings
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
  if (!theme) return;
  userSettingsStore.updateSettings({ theme: theme.name });
  closePalette();
}

// --- Palette helpers
function closePalette() {
  cpOpen.value = false;
  selectedOption.value = undefined;
  query.value = "";
  highlightedIndex.value = 0;
}

// --- Key Navigation
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
      if (highlightedIndex.value >= 0 && highlightedIndex.value < opts.length) {
        selectOption(opts[highlightedIndex.value]); // type: Option
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (selectedOption.value) {
        selectedOption.value = undefined;
        query.value = "";
        highlightedIndex.value = 0;
      } else {
        cpOpen.value = false;
      }
    }
  }
}

// --- Keybinding for palette open/close
function handleKeyDown(event: KeyboardEvent) {
  const route = useRoute();
  if (["/login", "/register"].includes(route.path)) return;
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;
  if (cmdOrCtrl && event.shiftKey && event.key.toLowerCase() === "p") {
    event.preventDefault();
    cpOpen.value = !cpOpen.value;
    nextTick(() => inputRef.value?.focus());
  }
}

// --- Option Row Refs
function setOptionRef(el: Element | null, i: number) {
  if (el) rowRefs.value[i] = el as HTMLElement;
}

// --- Scroll to highlighted item in list
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
  if (selectedOption.value?.label !== "theme") return;
  const currentTheme = userSettingsStore.settings.theme;
  const idx = filteredThemes.value.findIndex((t) => t.name === currentTheme);
  if (idx !== -1) {
    highlightedIndex.value = idx;
    nextTick(scrollToHighlighted);
  }
}

// --- Listeners & Watchers
watch([filteredOptions, filteredThemes, cpOpen, selectedOption], () => {
  rowRefs.value = [];
});
watch(highlightedIndex, () => nextTick(scrollToHighlighted));
watch(
  () => selectedOption.value?.label,
  (label) => {
    if (label === "theme") scrollToCurrentThemeIfOpen();
  },
);
watch([filteredOptions, cpOpen, query], ([options, open, q]) => {
  if (!open) highlightedIndex.value = 0;
  else if (
    q.length > 0 &&
    (options.length > 0 || filteredThemes.value.length > 0)
  )
    highlightedIndex.value = 0;
  else highlightedIndex.value = -1;
});

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  if (inputRef.value) inputRef.value.focus();
});
onBeforeUnmount(() => window.removeEventListener("keydown", handleKeyDown));
</script>

<template>
  <div
    v-if="cpOpen"
    class="fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center z-50"
    @click="
      () => {
        cpOpen = false;
        query = '';
        selectedOption = undefined;
      }
    "
  >
    <div
      class="flex flex-col backdrop-blur-lg bg-(--bg-color)/80 w-[600px] h-[600px] rounded-lg shadow-lg font-mono overflow-hidden command-palette"
      :style="{
        translate: uiStore.chatListVisible
          ? uiStore.chatListWidth / 2 + 'px'
          : '0px',
      }"
      @click.stop
    >
      <div
        class="h-12 flex items-center px-3 py-2 border-b border-(--sub-color) command-palette-search"
      >
        <Icon name="lucide:search" class="scale-125" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          placeholder="search"
          class="w-full bg-transparent! px-2! rounded-t-lg! rounded-b-none! focus:outline-none command-palette-input"
          @keydown="handleInputKeydown"
        />
      </div>
      <div class="h-full overflow-hidden command-palette-options">
        <div
          v-if="selectedOption?.label === 'theme'"
          ref="optionsRef"
          class="h-full overflow-y-auto"
        >
          <div
            v-for="(theme, i) in filteredThemes"
            :key="i"
            :ref="(el) => setOptionRef(el as HTMLElement, i)"
            class="h-9 cursor-pointer px-3 py-1 hover:bg-(--sub-alt-color) flex items-center justify-between gap-2 command-palette-theme"
            :class="[
              highlightedIndex === i
                ? 'bg-(--sub-color) text-(--text-color)'
                : '',
              userSettingsStore.settings.theme === theme.name
                ? 'bg-(--main-color) text-(--bg-color)'
                : '',
            ]"
            @click="selectTheme(theme)"
          >
            {{ theme.name }}
            <div
              class="rounded-full p-1.5 flex gap-1"
              :style="{ backgroundColor: theme.bgColor }"
            >
              <div
                class="w-4 h-4 rounded-full theme-color-main"
                :style="{ backgroundColor: theme.mainColor }"
              />
              <div
                class="w-4 h-4 rounded-full theme-color-sub"
                :style="{ backgroundColor: theme.subColor }"
              />
              <div
                class="w-4 h-4 rounded-full theme-color-text"
                :style="{ backgroundColor: theme.textColor }"
              />
            </div>
          </div>
        </div>
        <div v-else ref="optionsRef" class="overflow-y-auto">
          <div
            v-for="(option, i) in filteredOptions"
            :key="i"
            :ref="(el) => setOptionRef(el as HTMLElement, i)"
            class="h-9 cursor-pointer px-3 py-1 hover:bg-(--sub-alt-color) flex items-center gap-2 command-palette-option"
            :class="[
              highlightedIndex === i
                ? 'bg-(--sub-color) text-(--text-color)'
                : '',
            ]"
            @click="selectOption(option)"
          >
            <Icon v-if="option.icon" :name="option.icon" class="scale-125" />
            {{ option.label }}
          </div>
          <div v-if="filteredOptions.length === 0" class="p-3">no results</div>
        </div>
      </div>
    </div>
  </div>
</template>
