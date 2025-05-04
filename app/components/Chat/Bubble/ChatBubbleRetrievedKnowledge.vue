<script setup lang="ts">
import type { KnowledgeDocumentResponse } from "~~/server/utils/db/rag";

defineProps<{
  knowledge: KnowledgeState;
  retrievedKnowledge: KnowledgeDocumentResponse[];
}>();
const isModalOpen = ref(false);
</script>

<template>
  <div class="flex items-center">
    <Icon
      name="lucide:library"
      class="cursor-pointer text-(--main-color)"
      @click="isModalOpen = true"
    />
  </div>

  <!-- popup -->
  <ModalWindow
    :open="isModalOpen"
    :shift-for-chat-list="true"
    @close="isModalOpen = false"
  >
    <div class="flex flex-col gap-2 max-h-[80vh]">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon name="lucide:library" class="text-(--main-color) scale-125" />
          <div class="font-bold">{{ knowledge.name }}</div>
        </div>
        <Icon
          name="lucide:x"
          class="text-(--main-color) cursor-pointer"
          @click="isModalOpen = false"
        />
      </div>
      <div class="h-[1px] bg-(--sub-color) header-lines" />
      <div class="flex flex-col gap-2 overflow-y-auto">
        <div
          v-for="doc in retrievedKnowledge"
          :key="doc.id"
          class="whitespace-pre-wrap"
        >
          <div class="font-bold text-(--main-color) font-mono">
            {{ doc.source }} - {{ doc.chunkIndex }}
          </div>
          <div class="text-sm">
            {{ doc.text }}
          </div>
          <div class="text-(--sub-color) text-xs font-mono">
            {{ `distance: ${doc._distance}` }}
          </div>
        </div>
      </div>
    </div>
  </ModalWindow>
</template>
