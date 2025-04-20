<script setup lang="ts">
import fuzzysort from "fuzzysort";
import { type LocalChat, type LocalMessage, localDb } from "~/utils/db/local";
const uiStore = useUiStore();

function closeSearch() {
  uiStore.setChatSearchVisible(false);
}

// Handle search
const query = ref("");
const highlightedIndex = ref(0);
const searchResults = ref<LocalChat[]>([]);
const messages = ref<LocalMessage[]>([]);

async function exactSearchChatsByMessageContent(searchString: string) {
  const { user } = useAuth();
  if (!user.value) {
    throw new Error("User not authenticated");
  }

  // Filter messages by content
  const filteredMessages = messages.value.filter((message) =>
    message.content.toLowerCase().includes(searchString.toLowerCase()),
  );

  // Extract unique chat IDs
  const chatIds = Array.from(new Set(filteredMessages.map((m) => m.chatId)));

  // Fetch the chats (and filter out deleted if needed)
  const chats = await localDb.chatsTable
    .where("id")
    .anyOf(chatIds)
    .and((chat) => !chat.deleted)
    .toArray();

  return chats;
}

async function fuzzySearchChatsByMessageContent(query: string) {
  const { user } = useAuth();
  if (!user.value) {
    throw new Error("User not authenticated");
  }
  const results = fuzzysort.go(query, messages.value, {
    key: "content",
  });

  const chatIds = Array.from(new Set(results.map((res) => res.obj.chatId)));
  if (chatIds.length === 0) return [];

  const chats = await localDb.chatsTable
    .where("id")
    .anyOf(chatIds)
    .and((chat) => !chat.deleted)
    .toArray();

  const chatsMap = new Map(chats.map((chat) => [chat.id, chat]));
  const orderedChats = chatIds
    .map((id) => chatsMap.get(id))
    .filter(Boolean) as LocalChat[];

  return orderedChats;
}

async function searchChats() {
  if (query.value.length === 0) {
    searchResults.value = [];
    return;
  }
  if (userSettingsStore.settings.chatSearchMode === "exact") {
    const results = await exactSearchChatsByMessageContent(query.value);
    searchResults.value = results;
    return;
  } else if (userSettingsStore.settings.chatSearchMode === "fuzzy") {
    const results = await fuzzySearchChatsByMessageContent(query.value);
    searchResults.value = results;
    return;
  }
}

function handleInputKeydown(event: KeyboardEvent) {
  // This branch is for Option selection
  if (!searchResults.value || searchResults.value.length === 0) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightedIndex.value =
      (highlightedIndex.value + 1) % searchResults.value.length;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightedIndex.value =
      (highlightedIndex.value - 1 + searchResults.value.length) %
      searchResults.value.length;
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (
      highlightedIndex.value >= 0 &&
      highlightedIndex.value < searchResults.value.length
    ) {
      navigateTo(`/chat/${searchResults.value[highlightedIndex.value]?.id}`);
      closeSearch();
    }
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    highlightedIndex.value = 0;
    closeSearch();
  }
}

const searchRef = ref<HTMLElement | null>(null);
const rowRefs = ref<HTMLElement[]>([]);
function setOptionRef(el: Element | null, i: number) {
  if (el) rowRefs.value[i] = el as HTMLElement;
}
function scrollToHighlighted() {
  const container = searchRef.value;
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

watch(highlightedIndex, () => nextTick(scrollToHighlighted));

const inputRef = ref<HTMLInputElement | null>(null);
watch(
  () => uiStore.chatSearchVisible,
  async (newVal) => {
    if (newVal) {
      const { user } = useAuth();
      messages.value = await localDb.messagesTable
        .where({ userId: user.value?.id })
        .and((msg) => !msg.deleted)
        .toArray();
      nextTick(() => {
        inputRef.value?.focus();
      });
    } else {
      messages.value = [];
    }
  },
);

const route = useRoute();
function handleKeyDown(event: KeyboardEvent) {
  if (["/login", "/register"].includes(route.path)) return;
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;
  if (cmdOrCtrl && event.key.toLowerCase() === "k") {
    event.preventDefault();
    uiStore.setChatSearchVisible(!uiStore.chatSearchVisible);
    nextTick(() => inputRef.value?.focus());
  } else if (event.key === "Escape") {
    closeSearch();
  }
}

// Mounting and unmounting
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  if (inputRef.value) inputRef.value.focus();
});

onBeforeUnmount(() => window.removeEventListener("keydown", handleKeyDown));

const userSettingsStore = useUserSettingsStore();
</script>

<template>
  <div
    v-if="uiStore.chatSearchVisible"
    class="fixed top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black/20"
    @click="closeSearch"
  >
    <div
      class="flex flex-col backdrop-blur-lg bg-(--bg-color)/80 w-[600px] h-[600px] rounded-lg shadow-lg border border-(--sub-color) search-chats"
      :style="{
        translate: uiStore.chatListVisible
          ? uiStore.chatListWidth / 2 + 'px'
          : '0px',
      }"
      @click.stop
    >
      <div
        class="h-12 flex items-center px-3 py-2 border-b border-(--sub-color) search-chats-search"
      >
        <Icon name="lucide:search" class="scale-125" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          placeholder="search chats"
          class="w-full bg-transparent! px-2! rounded-t-lg! rounded-b-none! focus:outline-none search-chats-input"
          @keydown="handleInputKeydown"
          @input="
            () => {
              highlightedIndex = 0;
              searchChats();
            }
          "
        />
        <Icon
          v-if="query.length > 0"
          name="lucide:x"
          class="cursor-pointer scale-125"
          @click="
            () => {
              query = '';
              highlightedIndex = 0;
              searchResults = [];
              inputRef?.focus();
            }
          "
        />
      </div>
      <div
        ref="searchRef"
        class="h-full overflow-y-auto command-palette-options"
      >
        <div
          v-for="(result, i) in searchResults"
          :ref="(el) => setOptionRef(el as HTMLElement, i)"
          :key="i"
          class="w-full h-9 cursor-pointer px-3 py-1 hover:bg-(--sub-alt-color) flex items-center justify-between gap-2 overflow-hidden search-chats-option"
          :class="[
            highlightedIndex === i
              ? 'bg-(--sub-color) text-(--text-color)'
              : '',
          ]"
          @click="
            () => {
              navigateTo(`/chat/${result.id}`);
              closeSearch();
            }
          "
        >
          <div class="text-nowrap overflow-hidden overflow-ellipsis">
            {{ result.title }}
          </div>
          <div
            class="text-sm"
            :class="
              highlightedIndex === i
                ? 'text-(--main-color)!'
                : 'text-(--sub-color) '
            "
          >
            {{ result.updatedAt.toLocaleDateString() }}
          </div>
        </div>
        <div v-if="!searchResults || searchResults.length === 0" class="p-3">
          no results
        </div>
      </div>
    </div>
  </div>
</template>
