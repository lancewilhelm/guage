<script setup lang="ts">
const isChatListOpen = defineModel<boolean>("isChatListOpen");
const chatStore = useChatStore();

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
</script>

<template>
  <div class="flex justify-between py-2 px-4 items-center gap-4">
    <div class="flex gap-4 items-center">
      <Icon
        v-if="!isChatListOpen"
        name="lucide:panel-left-open"
        class="text-(--main-color) cursor-pointer scale-125"
        @click="isChatListOpen = true"
      />
      <Icon
        v-if="!isChatListOpen"
        name="lucide:plus"
        class="text-(--main-color) cursor-pointer scale-125"
        @click="
          () => {
            chatStore.setCurrentChatId(undefined);
            navigateTo('/chat');
          }
        "
      />
    </div>
    <div class="flex gap-4 items-center">
      <Icon
        name="lucide:settings"
        class="text-(--main-color) cursor-pointer scale-125"
        @click="() => console.log('open settings')"
      />
      <Icon
        name="lucide:log-out"
        class="text-(--main-color) cursor-pointer scale-125"
        @click="handleSignOut"
      />
    </div>
  </div>
</template>
