<script setup lang="ts">
definePageMeta({
  title: "Chat",
});

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
  <div class="w-full h-full">
    <div>Chat</div>
    <button class="cursor-pointer" @click="handleSignOut">logout</button>
  </div>
</template>
