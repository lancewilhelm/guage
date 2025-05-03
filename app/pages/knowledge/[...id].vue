<script setup lang="ts">
// Compute route ID
const route = useRoute();
const routeId = computed(() => {
  if (!route.params.id) return null;
  return Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
});

const { knowledge, deleteKnowledge } = useKnowledgeStore();
const k = computed(() => {
  if (!routeId.value) return null;
  if (!knowledge[routeId.value]) navigateTo("/knowledge");
  return knowledge[routeId.value];
});

const deleteKnowledgeModalVisible = ref(false);
const deleteKnowledgeConfirmation = ref("");
const deleteKnowledgeConfirmationRef = ref<HTMLElement | null>(null);
</script>
<template>
  <div class="w-full h-full flex flex-col overflow-hidden">
    <AppHeader />
    <div
      class="h-full w-full overflow-x-hidden overflow-y-auto pt-4 knowledge-container focus:outline-none"
    >
      <div
        ref="scrollRef"
        class="max-w-(--chat-max-width) mx-auto mb-4 px-6 flex flex-col gap-4 knowlege-content"
      >
        <NuxtLink
          to="/knowledge"
          class="text-(--sub-color) text-lg flex items-center gap-2"
        >
          <Icon name="lucide:chevron-left" class="scale-125" />
          back
        </NuxtLink>
        <h2>{{ k?.name }}</h2>
        <div class="text-(--sub-color) text-lg">{{ k?.provider }}</div>
        <div>
          created:
          {{ k?.createdAt && new Date(k?.createdAt).toLocaleDateString() }}
          {{ k?.createdAt && new Date(k?.createdAt).toLocaleTimeString() }}
        </div>
        <div>
          updated:
          {{ k?.updatedAt && new Date(k?.updatedAt).toLocaleDateString() }}
          {{ k?.updatedAt && new Date(k?.updatedAt).toLocaleTimeString() }}
        </div>
        <div>documents: {{ k?.details.documents }}</div>
        <div>chunks: {{ k?.details.chunks }}</div>
        <button
          class="bg-(--error-color) rounded-lg"
          @click="
            () => {
              deleteKnowledgeModalVisible = true;
              nextTick(() => {
                deleteKnowledgeConfirmationRef?.focus();
              });
            }
          "
        >
          <Icon name="lucide:trash-2" class="scale-125" />
          delete
        </button>
      </div>
    </div>

    <!-- Delete User Modal -->
    <ModalWindow
      :open="deleteKnowledgeModalVisible"
      @close="
        () => {
          deleteKnowledgeModalVisible = false;
          deleteKnowledgeConfirmation = '';
        }
      "
    >
      <div class="flex flex-col items-center justify-center gap-2">
        <div class="text-(--text-color) text-lg text-center">
          Are you sure you want to delete {{ k?.name }}? This action cannot be
          undone.
        </div>
        <div class="text-(--text-color) text-lg text-center">
          If you are sure, please type the name below.
        </div>
        <input
          ref="deleteKnowledgeConfirmationRef"
          v-model="deleteKnowledgeConfirmation"
          type="text"
          placeholder="database name"
          class="w-full p-2 border border-(--sub-color) rounded-lg"
          @keyup.enter="
            async () => {
              if (!k?.id) return;
              await deleteKnowledge(k?.id);
              navigateTo('/knowledge');
            }
          "
        />
        <button
          :class="[
            'flex items-center gap-2 mt-2 bg-(--main-color) text-(--bg-color) p-2 rounded-lg px-4',
            deleteKnowledgeConfirmation === k?.name
              ? 'opacity-100 cursor-pointer'
              : 'opacity-50 cursor-default',
          ]"
          :disabled="deleteKnowledgeConfirmation !== k?.name"
          @click="
            async () => {
              if (!k?.id) return;
              await deleteKnowledge(k?.id);
              navigateTo('/knowledge');
            }
          "
        >
          delete database
        </button>
      </div>
    </ModalWindow>
  </div>
</template>
