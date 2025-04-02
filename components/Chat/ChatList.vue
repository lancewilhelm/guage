<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
}>();
const emit = defineEmits<{
  (e: "close"): void;
}>();

const chatListRef = ref<HTMLElement | null>(null);
const resizerRef = ref<HTMLElement | null>(null);

const minWidth = 250;
const maxWidth = 600;
const targetWidth = ref(300);

useDraggable(resizerRef, {
  preventDefault: true,
  onMove: (position) => {
    if (position.x < minWidth / 2) {
      emit("close");
    } else {
      targetWidth.value = Math.max(minWidth, Math.min(position.x, maxWidth));
    }
  },
});
</script>

<template>
  <div
    ref="chatListRef"
    class="h-full bg-(--sub-alt-color)"
    :style="{
      width: targetWidth + 'px',
      display: props.isOpen ? 'flex' : 'none',
    }"
  >
    <div class="flex flex-col grow w-full">
      <div class="flex w-full h-[40px] items-center px-4">
        <Icon
          name="lucide:panel-left-close"
          class="text-(--main-color) cursor-pointer scale-125"
          @click="emit('close')"
        />
        <div class="grow text-center">Chats</div>
        <Icon
          name="lucide:plus"
          class="text-(--main-color) cursor-pointer scale-125"
          @click="() => console.log('create new chat')"
        />
      </div>
      <div class="flex flex-col justify-center p-2 overflow-hidden">
        <div class="flex flex-col w-full items-center gap-2">
          <div class="flex flex-col w-full gap-2">
            <!-- Sessions List -->
          </div>
        </div>
      </div>
    </div>
    <div ref="resizerRef" class="flex cursor-ew-resize">
      <!-- Some trickery to create a 1px border with a wide hover range -->
      <div class="w-[3px] bg-(--sub-alt-color)" />
      <div class="w-[3px] bg-(--bg-color)" />
    </div>
  </div>
</template>
