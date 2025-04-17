<script setup lang="ts">
import fuzzysort from "fuzzysort";
import themesList from "~/assets/json/themes.json";

interface Theme {
  name: string;
  bgColor: string;
  mainColor: string;
  subColor: string;
  textColor: string;
}

const allThemes = computed<Theme[]>(() =>
  JSON.parse(JSON.stringify(themesList)).sort((a: Theme, b: Theme) =>
    a.name.localeCompare(b.name),
  ),
);

interface Option {
  label: string;
  icon?: string;
  action?: () => void;
  options?: Option[];
}

const { signOut } = useAuth();
const userSettingsStore = useUserSettingsStore();
// Define the options for the command palette
const options = ref<Option[]>([
  { label: "theme", icon: "lucide:palette" },
  {
    label: "add current theme to favorites",
    icon: "fa6-solid:star",
    action: () => {
      if (
        !userSettingsStore.settings.theme ||
        userSettingsStore.settings.favoriteThemes?.includes(
          userSettingsStore.settings.theme,
        )
      ) {
        return;
      }
      userSettingsStore.updateSettings({
        favoriteThemes: [
          ...(userSettingsStore.settings.favoriteThemes || []),
          userSettingsStore.settings.theme,
        ],
      });
    },
  },
  {
    label: "message display mode",
    icon: "lucide:message-square-text",
    options: [
      {
        label: "markdown",
        action: () => {
          userSettingsStore.updateSettings({
            messageDisplayMode: "markdown",
          });
        },
      },
      {
        label: "plaintext",
        action: () => {
          userSettingsStore.updateSettings({
            messageDisplayMode: "plaintext",
          });
        },
      },
      {
        label: "monospace",
        action: () => {
          userSettingsStore.updateSettings({
            messageDisplayMode: "monospace",
          });
        },
      },
    ],
  },
  {
    label: "log out",
    icon: "lucide:log-out",
    action: () => {
      signOut();
    },
  },
]);

const cpOpen = ref(false);
const query = ref("");
const selectedOption = ref<Option>();

const filteredOptions = computed(() => {
  const src = selectedOption.value?.options ?? options.value;
  if (!query.value) return src;
  return fuzzysort.go(query.value, src, { key: "label" }).map((r) => r.obj);
});

const filteredThemes = computed(() => {
  if (!query.value) return allThemes.value;
  return fuzzysort
    .go(query.value, allThemes.value, { key: "name" })
    .map((r) => r.obj);
});

function selectOption(option?: Option) {
  if (!option) return;
  query.value = "";

  if (option.action) {
    option.action();
    cpOpen.value = false;
    selectedOption.value = undefined;
    query.value = "";
  } else if (option.options) {
    selectedOption.value = option;
  } else if (option.label === "theme") {
    selectedOption.value = option;
  }
}

const userSettinsgStore = useUserSettingsStore();
function selectTheme(theme?: Theme) {
  if (!theme) return;
  userSettinsgStore.updateSettings({
    theme: theme.name,
  });
  cpOpen.value = false;
  selectedOption.value = undefined;
  query.value = "";
}

function handleKeyDown(event: KeyboardEvent) {
  const route = useRoute();
  if (route.path === "/login" || route.path === "/register") return;

  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;
  if (cmdOrCtrl && event.shiftKey && event.key.toLowerCase() === "p") {
    event.preventDefault();
    cpOpen.value = !cpOpen.value;
    nextTick(() => {
      if (cpOpen.value && inputRef.value) {
        inputRef.value.focus();
      }
    });
  }
}

const highlightedIndex = ref(0);

watch([filteredOptions, cpOpen, query], ([options, open, q]) => {
  if (!open) {
    highlightedIndex.value = 0;
    return;
  }
  // Always highlight first item if there's query and results
  if (q.length > 0 && (options.length > 0 || filteredThemes.value.length > 0)) {
    highlightedIndex.value = 0;
  } else {
    highlightedIndex.value = -1;
  }
});

function handleInputKeydown(event: KeyboardEvent) {
  if (filteredOptions.value.length) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      highlightedIndex.value =
        (highlightedIndex.value + 1) % filteredOptions.value.length;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      highlightedIndex.value =
        (highlightedIndex.value - 1 + filteredOptions.value.length) %
        filteredOptions.value.length;
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (
        highlightedIndex.value >= 0 &&
        highlightedIndex.value < filteredOptions.value.length
      ) {
        selectOption(filteredOptions.value[highlightedIndex.value]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (selectedOption.value) {
        selectedOption.value = undefined;
      } else {
        cpOpen.value = false;
      }
    }
  } else if (filteredThemes.value.length) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      highlightedIndex.value =
        (highlightedIndex.value + 1) % filteredThemes.value.length;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      highlightedIndex.value =
        (highlightedIndex.value - 1 + filteredThemes.value.length) %
        filteredThemes.value.length;
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (
        highlightedIndex.value >= 0 &&
        highlightedIndex.value < filteredThemes.value.length
      ) {
        selectTheme(filteredThemes.value[highlightedIndex.value]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      cpOpen.value = false;
    }
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  if (inputRef.value) {
    inputRef.value.focus();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown);
});

const inputRef = ref<HTMLInputElement | null>(null);
const uiStore = useUiStore();
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
      class="backdrop-blur-lg bg-(--bg-color)/80 w-[600px] h-[600px] rounded-lg shadow-lg font-mono overflow-hidden"
      :style="{
        translate: uiStore.chatListVisible
          ? uiStore.chatListWidth / 2 + 'px'
          : '0px',
      }"
      @click.stop
    >
      <div class="flex items-center px-3 py-2 border-b border-(--sub-color)">
        <Icon name="lucide:search" class="scale-125" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          placeholder="search"
          class="w-full bg-transparent! px-2! rounded-t-lg! rounded-b-none! focus:outline-none"
          @keydown="handleInputKeydown"
        />
      </div>
      <div class="h-full overflow-hidden">
        <div
          v-if="selectedOption?.label === 'theme'"
          class="h-full overflow-y-auto"
        >
          <div
            v-for="(theme, i) in filteredThemes"
            :key="i"
            class="cursor-pointer px-3 py-1 hover:bg-(--sub-alt-color) flex items-center justify-between gap-2"
            :class="highlightedIndex === i ? 'bg-(--sub-alt-color)' : ''"
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
        <div v-else class="overflow-y-auto">
          <div
            v-for="(option, i) in filteredOptions"
            :key="i"
            class="cursor-pointer px-3 py-1 hover:bg-(--sub-alt-color) flex items-center gap-2"
            :class="highlightedIndex === i ? 'bg-(--sub-alt-color)' : ''"
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
