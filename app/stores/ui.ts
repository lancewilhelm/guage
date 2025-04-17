import { defineStore } from "pinia";

export const useUiStore = defineStore(
  "ui",
  () => {
    const chatListWidth = ref(300);
    function setChatListWidth(width: number) {
      chatListWidth.value = width;
    }

    const chatListVisible = ref(true);
    function setChatListVisible(visible: boolean) {
      chatListVisible.value = visible;
    }

    const inputHeight = ref(0);
    function setInputHeight(height: number) {
      inputHeight.value = height;
    }

    const commandPaletteVisible = ref(false);
    function setCommandPaletteVisible(visible: boolean) {
      commandPaletteVisible.value = visible;
    }

    function $reset() {
      chatListWidth.value = 300;
      chatListVisible.value = true;
      inputHeight.value = 0;
    }

    return {
      chatListWidth,
      setChatListWidth,
      chatListVisible,
      setChatListVisible,
      inputHeight,
      commandPaletteVisible,
      setCommandPaletteVisible,
      setInputHeight,
      $reset,
    };
  },
  {
    persist: true,
  },
);
