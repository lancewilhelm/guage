export function useChatScroll() {
  const chatContainerRef = ref<HTMLElement | null>(null);
  const shouldAutoScroll = ref(true);
  const scrollButtonVisible = ref(false);

  let isUserScrolling = false;

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTo({
        top: chatContainerRef.value.scrollHeight,
        behavior,
      });
    }
  }

  function updateScrollButtonVisibility() {
    if (chatContainerRef.value) {
      const container = chatContainerRef.value;
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;

      // Show button when not near bottom
      scrollButtonVisible.value = distanceFromBottom > 50;
    }
  }

  function handleUserScroll() {
    if (!isUserScrolling) {
      isUserScrolling = true;

      if (chatContainerRef.value) {
        const container = chatContainerRef.value;
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;

        // Disable auto-scroll when user scrolls up
        shouldAutoScroll.value = distanceFromBottom <= 50;
      }

      updateScrollButtonVisibility();
      isUserScrolling = false;
    }
  }

  function setupScrollListeners() {
    if (chatContainerRef.value) {
      updateScrollButtonVisibility();
      chatContainerRef.value.addEventListener("scroll", handleUserScroll);
    }
  }

  function cleanupScrollListeners() {
    if (chatContainerRef.value) {
      chatContainerRef.value.removeEventListener("scroll", handleUserScroll);
    }
  }

  function initialScrollToBottom() {
    if (!chatContainerRef.value) return;

    const container = chatContainerRef.value;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const observer = new MutationObserver(() => {
      if (timeout) clearTimeout(timeout);

      // Wait for a short burst of mutations to settle
      timeout = setTimeout(() => {
        scrollToBottom("instant");
        observer.disconnect();
      }, 10); // debounce time — adjust as needed
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // Fallback in case no mutations happen (e.g., super short chat)
    setTimeout(() => {
      scrollToBottom("instant");
      observer.disconnect();
    }, 1000);
  }

  onMounted(() => {
    setupScrollListeners();
  });

  onUnmounted(() => {
    cleanupScrollListeners();
  });

  return {
    chatContainerRef,
    shouldAutoScroll,
    scrollButtonVisible,
    scrollToBottom,
    updateScrollButtonVisibility,
    initialScrollToBottom,
  };
}
