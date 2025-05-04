<script setup lang="ts">
const { knowledge, fetchKnowledge } = useKnowledgeStore();

onMounted(async () => {
  fetchKnowledge();
});
</script>

<template>
  <div class="w-full h-full flex flex-col overflow-hidden">
    <AppHeader />
    <div
      class="h-full w-full overflow-x-hidden overflow-y-auto pt-2 knowledge-container focus:outline-none"
    >
      <div
        class="max-w-(--chat-max-width) mx-auto px-6 flex flex-col gap-4 knowlege-content"
      >
        <h2>knowledge</h2>
        <div>
          create & manage knowledge databases that you can refer to in your
          chats using
          <NuxtLink to="https://arxiv.org/pdf/2005.11401" class="underline">
            retrieval augmented generation (RAG)</NuxtLink
          >.
        </div>
        <div class="h-[1px] bg-(--sub-color) my-4" />
        <div class="flex flex-col gap-4">
          <h3>databases</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div
              v-for="database in knowledge"
              :key="database.id"
              class="flex flex-col p-4 gap-2 rounded-lg bg-(--sub-alt-color) cursor-pointer focus-outline"
              tabindex="0"
              @click="navigateTo(`/knowledge/${database.id}`)"
              @keydown.enter="navigateTo(`/knowledge/${database.id}`)"
              @keydown.space.prevent="navigateTo(`/knowledge/${database.id}`)"
            >
              <div class="text-(--main-color) text-xl">
                {{ database.name }}
              </div>
              <div class="text-(--sub-color)">{{ database.provider }}</div>
              <div class="">Documents: {{ database.documents }}</div>
              <div class="">Chunks: {{ database.chunks }}</div>
            </div>
            <div
              v-if="Object.keys(knowledge).length === 0"
              class="text-(--sub-color)"
            >
              no databases found.
            </div>
          </div>
          <button
            class="bg-(--sub-color) rounded-lg"
            @click="navigateTo('/knowledge/new')"
          >
            <Icon name="lucide:plus" class="scale-125" />
            create new database
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
