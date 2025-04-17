<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();
const uiStore = useUiStore();

// --- Palette State
const {
  isOpen,
  query,
  selectedOption,
  highlightedIndex,
  inputRef,
  optionsRef,
  filteredOptions,
  filteredThemes,
  selectOption,
  selectTheme,
  handleInputKeydown,
  setOptionRef,
} = useCommandPalette();

// --- Keybinding for palette open/close
function handleKeyDown(event: KeyboardEvent) {
  const route = useRoute();
  if (["/login", "/register"].includes(route.path)) return;
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;
  if (cmdOrCtrl && event.shiftKey && event.key.toLowerCase() === "p") {
    event.preventDefault();
    isOpen.value = !isOpen.value;
    nextTick(() => inputRef.value?.focus());
  }
}
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  if (inputRef.value) inputRef.value.focus();
});

onBeforeUnmount(() => window.removeEventListener("keydown", handleKeyDown));
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center z-50"
    @click="
      () => {
        isOpen = false;
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
