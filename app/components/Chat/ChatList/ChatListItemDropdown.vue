<script setup lang="ts">
import { dbUpdateChat } from "~/utils/db/local";

const props = defineProps<{
  isHovered: boolean;
  chat: ChatState;
}>();
const emit = defineEmits(["rename"]);

const dropdownVisible = ref(false);
const dropdownTrigger = ref<HTMLElement | null>(null);
const dropdownMenu = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

function toggleDropdown() {
  dropdownVisible.value = !dropdownVisible.value;
  if (dropdownVisible.value) {
    nextTick(() => {
      setDropdownPosition();
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
      document.addEventListener("click", onClickOutside);
    });
  } else {
    window.removeEventListener("scroll", updateDropdownPosition, true);
    window.removeEventListener("resize", updateDropdownPosition);
    document.removeEventListener("click", onClickOutside);
  }
}

const isMobile = computed(() => {
  return window.innerWidth <= 448; // Tailwind's sm breakpoint
});
function setDropdownPosition() {
  if (dropdownTrigger.value) {
    const rect = dropdownTrigger.value.getBoundingClientRect();
    const menuWidth = 100; // Approximate width in px, adjust as needed

    const top = rect.bottom;
    let left = rect.left;

    if (isMobile.value) {
      // Show to the left of the button
      left = Math.max(8, rect.right - menuWidth); // 8px padding from edge
    }

    dropdownStyle.value = {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      zIndex: "9999",
    };
  }
}

function updateDropdownPosition() {
  if (dropdownVisible.value) {
    setDropdownPosition();
  }
}

function onClickOutside(e: MouseEvent) {
  if (
    dropdownMenu.value &&
    !dropdownMenu.value.contains(e.target as Node) &&
    dropdownTrigger.value &&
    !dropdownTrigger.value.contains(e.target as Node)
  ) {
    dropdownVisible.value = false;
    window.removeEventListener("scroll", updateDropdownPosition, true);
    window.removeEventListener("resize", updateDropdownPosition);
    document.removeEventListener("click", onClickOutside);
  }
}

onBeforeUnmount(() => {
  window.removeEventListener("scroll", updateDropdownPosition, true);
  window.removeEventListener("resize", updateDropdownPosition);
  document.removeEventListener("click", onClickOutside);
});

const isDeleting = ref(false);

const chatStore = useChatStore();
</script>

<template>
  <div class="relative">
    <div
      ref="dropdownTrigger"
      class="flex items-center cursor-pointer"
      :class="{
        'opacity-0': !props.isHovered && !dropdownVisible,
        'opacity-100': props.isHovered || dropdownVisible || isMobile,
      }"
      @mousedown.prevent.stop="toggleDropdown"
      @dblclick.prevent.stop
    >
      <Icon name="lucide:more-horizontal" class="scale-125" />
    </div>

    <!-- popup -->
    <teleport to="body">
      <div
        v-if="dropdownVisible"
        ref="dropdownMenu"
        class="fixed z-[9999] border border-(--sub-color) bg-(--bg-color) rounded-lg shadow-lg"
        :style="dropdownStyle"
      >
        <div
          class="w-full flex items-center gap-2 p-2 m-0! text-left cursor-pointer hover:opacity-60 h-[40px]"
          @click="
            () => {
              chatStore.updateChatMetadata(props.chat.id, {
                pinned: !props.chat.pinned,
              });
              dbUpdateChat(props.chat.id, { pinned: !props.chat.pinned });
            }
          "
        >
          <Icon
            :name="props.chat.pinned ? 'lucide:pin-off' : 'lucide:pin'"
            class="scale-125"
          />
          {{ props.chat.pinned ? "Unpin" : "Pin" }}
        </div>
        <div
          class="w-full flex items-center gap-2 p-2 m-0! text-left cursor-pointer hover:opacity-60 h-[40px]"
          @click="emit('rename')"
        >
          <Icon name="lucide:edit" class="scale-125" />
          Rename
        </div>
        <div
          v-if="!isDeleting"
          class="w-full flex items-center gap-2 p-2 m-0! text-left cursor-pointer hover:opacity-60 h-[40px]"
          @click.stop.prevent="
            () => {
              isDeleting = true;
            }
          "
        >
          <Icon name="lucide:trash" class="scale-125 text-(--error-color)" />
          Delete
        </div>
        <div v-else class="w-full flex">
          <div
            class="flex items-center justify-center bg-(--error-color) cursor-pointer grow p-1 rounded m-1 mr-0.5 h-[32px]"
            @click.stop.prevent="
              () => {
                chatStore.deleteChat(props.chat.id);
                dbUpdateChat(props.chat.id, { deleted: true });
                isDeleting = false;
              }
            "
          >
            <Icon name="lucide:trash-2" class="scale-125 text-(--bg-color)" />
          </div>
          <div
            class="flex items-center justify-center bg-(--main-color) cursor-pointer grow-3 p-1 rounded m-1 ml-0.5"
            @click.stop.prevent="isDeleting = false"
          >
            <Icon name="lucide:x" class="scale-125 text-(--bg-color)" />
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
