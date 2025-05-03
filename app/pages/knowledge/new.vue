<script setup lang="ts">
const provider = ref("local");
const dbName = ref("");
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
  uploadStatus.value = "Uploading files..."; // Set status to uploading

  if (pendingFiles.value.length === 0) {
    uploadStatus.value = "No files selected to upload.";
    console.warn("No files to upload.");
    return; // Stop the function if no files are present
  }

  const formData = new FormData();
  formData.append("provider", provider.value);
  formData.append("dbName", dbName.value);

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
          const { createKnowledge } = useKnowledgeStore();
          createKnowledge(
            data.id,
            data.dbName,
            provider.value,
            data.createdAt,
            data.updatedAt,
            data.documents,
            data.chunks,
          );
          navigateTo("/knowledge");
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
      class="h-full w-full overflow-x-hidden overflow-y-auto pt-2 knowledge-container focus:outline-none"
    >
      <div
        ref="scrollRef"
        class="max-w-(--chat-max-width) mx-auto mb-4 px-6 flex flex-col gap-4 knowlege-content"
      >
        <h2>new knowledge database</h2>
        <div>create a new database using one of the providers below</div>
        <div class="h-[1px] bg-(--sub-color) my-4" />
        <div class="flex flex-col gap-4">
          <h4>1. name your database</h4>
          <div class="flex items-center gap-4">
            <input
              v-model="dbName"
              type="text"
              placeholder="database name"
              class="p-2 rounded-lg bg-(--sub-alt-color) w-full"
            />
          </div>
        </div>
        <div v-if="dbName" class="h-[1px] bg-(--sub-color) my-4" />
        <div v-if="dbName" class="flex flex-col gap-4">
          <h4>2. pick provider</h4>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <h5>local</h5>
              <div
                class="p-4 rounded-lg cursor-pointer"
                :class="
                  provider === 'local'
                    ? 'bg-(--main-color) text-(--bg-color)'
                    : 'bg-(--sub-alt-color) '
                "
                @click="provider = 'local'"
              >
                local (LanceDB)
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <h5>remote</h5>
              <div
                class="p-4 rounded-lg cursor-pointer"
                :class="
                  provider === 'Pinecone'
                    ? 'bg-(--main-color) text-(--bg-color)'
                    : 'bg-(--sub-alt-color) '
                "
                @click="provider = 'Pinecone'"
              >
                Pinecone
              </div>
            </div>
          </div>
        </div>
        <div v-if="dbName && provider" class="h-[1px] bg-(--sub-color) my-4" />
        <div v-if="dbName && provider" class="flex flex-col gap-4">
          <h4>3. add files</h4>
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
        <div v-if="pendingFiles.length" class="h-[1px] bg-(--sub-color) my-4" />
        <div v-if="pendingFiles.length" class="flex flex-col gap-4">
          <h4>4. review files</h4>
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
            5. upload files and create database
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
</template>
