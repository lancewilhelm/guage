<script setup lang="ts">
useHead({
  titleTemplate: (title) => {
    return title ? `${title} | Guage` : "Guage";
  },
});
</script>

<template>
  <div class="w-dvw h-dvh overflow-hidden">
    <NuxtPage />
  </div>
</template>
