export function useChatInput() {
  const chatInputRef = ref<HTMLElement | null>(null);

  function focusInput() {
    if (chatInputRef.value) {
      nextTick(() => {
        chatInputRef.value?.focus();
      });
    }
  }

  return {
    chatInputRef,
    focusInput,
  };
}
