<script setup lang="ts">
async function handleSignOut() {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        navigateTo("/login");
      },
      onError: (error) => {
        console.error("Sign out error:", error);
      },
    },
  });
}

const chatStore = useChatStore();
</script>

<template>
  <div class="flex justify-between py-2 px-4 items-center gap-4">
    <div class="header-left-icons flex gap-4 items-center">
      <Icon
        name="lucide:bot-message-square"
        class="text-(--main-color) cursor-pointer scale-125"
        @click="
          () => {
            if (chatStore.currentChatId) {
              navigateTo(`/chat/${chatStore.currentChatId}`);
            } else {
              navigateTo('/chat');
            }
          }
        "
      />
    </div>
    <div class="header-right-icons flex gap-4 items-center">
      <Icon
        name="lucide:log-out"
        class="text-(--main-color) cursor-pointer scale-125"
        @click="handleSignOut"
      />
    </div>
  </div>
</template>
