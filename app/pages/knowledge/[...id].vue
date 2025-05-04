<script setup lang="ts">
// Compute route ID
const route = useRoute();
const routeId = computed(() => {
  if (!route.params.id) return null;
  return Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
});

const { isLoading, knowledge, deleteKnowledge } = useKnowledgeStore();
const k = computed(() => {
  if (!routeId.value) return null;
  if (!knowledge[routeId.value] && !isLoading) navigateTo("/knowledge");
  // getDocuments(knowledge[routeId.value]?.name);
  return knowledge[routeId.value];
});

// async function getDocuments(knowledgeName?: string) {
//   if (!knowledgeName) return;
//   const response = await $fetch("/api/knowledge/document", {
//     method: "GET",
//     params: {
//       knowledgeName,
//       type: "all",
//     },
//   });
//   if (!response) {
//     throw new Error("Failed to retrieve knowledge");
//   }
//   console.log("response:", response);
// }

const deleteKnowledgeModalVisible = ref(false);
const deleteKnowledgeConfirmation = ref("");
const deleteKnowledgeConfirmationRef = ref<HTMLElement | null>(null);
const showAddDocuments = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const dropZoneRef = ref<HTMLDivElement | null>(null);
const pendingFiles = ref<File[]>([]);
const uploadProgress = ref<{
  fileName: string;
  percent: number;
} | null>(null);
const uploadStatus = ref(""); // Add a ref to display upload status

function onDrop(files: File[] | null) {
  if (files && files.length > 0) {
    // Filter for accepted types if needed, or rely on backend validation
    pendingFiles.value.push(...files);
  }
}
const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop,
  // You might want to allow more types like '.pdf', etc.
  multiple: true,
});

const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

const handleFileChange = (event: Event) => {
  const fileInput = event.target as HTMLInputElement;
  if (fileInput.files && fileInput.files.length > 0) {
    const files = Array.from(fileInput.files);
    // Filter for accepted types if needed
    pendingFiles.value.push(...files);
  }
};

async function uploadFiles() {
  if (!k.value) return;
  uploadStatus.value = "Uploading files..."; // Set status to uploading

  if (pendingFiles.value.length === 0) {
    uploadStatus.value = "No files selected to upload.";
    console.warn("No files to upload.");
    return; // Stop the function if no files are present
  }

  const formData = new FormData();
  formData.append("provider", k.value.provider);
  formData.append("dbName", k.value.name);

  // Loop through the array of files and append each one
  // using the same key name ("documents").
  for (const file of pendingFiles.value) {
    formData.append("documents", file);
  }

  // Handle the file upload
  try {
    // $fetch will correctly handle the FormData body for a POST request
    const response = await fetch("/api/knowledge/document", {
      method: "POST",
      body: formData,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to create DB: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    pendingFiles.value = []; // Clear the pending files after starting the upload

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the chunk and update the upload status
      const chunk = decoder.decode(value);
      const events = parseSSEChunk(chunk);
      for (const event of events) {
        if (event.eventType === "progress") {
          uploadProgress.value = JSON.parse(event.data);
        } else if (event.eventType === "error") {
          uploadStatus.value = `Error: ${event.data}`;
        } else if (event.eventType === "success") {
          const data = JSON.parse(event.data);
          const { updateKnowledge, fetchKnowledge } = useKnowledgeStore();
          updateKnowledge(
            data.id,
            data.dbName,
            data.provider,
            data.createdAt,
            data.updatedAt,
            data.documents,
            data.chunks,
          );
          await fetchKnowledge();
          showAddDocuments.value = false;
        }
      }
    }
  } catch (error) {
    console.error("Error uploading files:", error);
    uploadStatus.value = `Error uploading files: ${error}`; // Display error message
  } finally {
    // Clear the file input value regardless of success or failure
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
  }
}
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
        <div>documents: {{ k?.documents }}</div>
        <div>chunks: {{ k?.chunks }}</div>
        <div class="flex gap-2">
          <button
            class="bg-(--sub-color) rounded-lg"
            @click="showAddDocuments = !showAddDocuments"
          >
            <Icon name="lucide:file-plus" class="scale-125" />
            add documents
          </button>
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
        <div v-if="showAddDocuments">
          <div class="h-[1px] bg-(--sub-color) my-4" />
          <div class="flex flex-col gap-4">
            <h4>1. add files</h4>
            <div
              class="grid grid-cols-[1fr_min-content_2fr] items-center gap-4 h-[200px]"
            >
              <div
                class="h-full flex items-center justify-center gap-3 bg-(--sub-color) rounded-lg cursor-pointer"
                @click="triggerFileInput"
                @keydown.enter="triggerFileInput"
                @keydown.space="triggerFileInput"
              >
                <Icon
                  name="lucide:upload"
                  class="text-(--main-color) scale-150"
                />
                browse local files
              </div>
              <input
                ref="fileInputRef"
                type="file"
                multiple
                accept=".txt,.pdf"
                class="hidden"
                @change="handleFileChange"
              />
              <div>or</div>
              <div
                ref="dropZoneRef"
                class="h-full flex items-center justify-center bg-(--sub-alt-color) rounded-lg border-3 border-dashed"
                :class="
                  isOverDropZone
                    ? 'border-(--main-color)'
                    : 'border-(--sub-color)'
                "
              >
                drag and drop files here
              </div>
            </div>
          </div>
          <div
            v-if="pendingFiles.length"
            class="h-[1px] bg-(--sub-color) my-4"
          />
          <div v-if="pendingFiles.length" class="flex flex-col gap-4">
            <h4>2. review files</h4>
            <div
              v-for="file in pendingFiles"
              :key="file.name"
              class="flex justify-between"
            >
              {{ file.name }}
              <Icon
                name="lucide:x"
                class="text-(--error-color) scale-150 cursor-pointer"
                @click="
                  () => {
                    pendingFiles = pendingFiles.filter(
                      (f) => f.name !== file.name,
                    );
                  }
                "
              />
            </div>
            <button
              class="bg-(--main-color) text-(--bg-color) rounded-lg p-2"
              @click="uploadFiles"
            >
              3. upload files and create database
            </button>
          </div>
          <!-- Display the upload status -->
          <div v-if="uploadProgress" class="flex gap-3 items-center">
            <div>{{ uploadProgress.fileName }}</div>
            <div class="w-[200px] h-2 bg-(--sub-color) rounded-full">
              <div
                class="h-full bg-(--main-color) rounded-full"
                :style="{
                  width: (uploadProgress.percent || 0) + '%',
                }"
              />
            </div>
            <div>{{ uploadProgress.percent || 0 }}%</div>
          </div>
          <div v-if="uploadStatus" class="mt-2 text-sm">{{ uploadStatus }}</div>
        </div>
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
              await deleteKnowledge(k?.id, k?.name);
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
              await deleteKnowledge(k?.id, k?.name);
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
