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
    return {
      chatListWidth,
      setChatListWidth,
      chatListVisible,
      setChatListVisible,
    };
  },
  {
    persist: true,
  },
);
