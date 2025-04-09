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

    return {
      chatListWidth,
      setChatListWidth,
      chatListVisible,
      setChatListVisible,
      inputHeight,
      setInputHeight,
    };
  },
  {
    persist: true,
  },
);
