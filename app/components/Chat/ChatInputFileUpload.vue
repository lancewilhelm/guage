<script setup lang="ts">
import type { MessageFile } from "~/utils/db/local";

// Handle file input
const fileInputRef = ref<HTMLInputElement | null>(null);
const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

async function handleFileChange(event: Event) {
  const fileInput = event.target as HTMLInputElement;
  if (fileInput.files && fileInput.files.length > 0) {
    const file = fileInput.files[0] as File;
    const fileName = file.name;
    const fileType = file.type;

    if (fileType === "text/plain") {
      const fileText = await file.text();
      emit("fileUploaded", {
        name: fileName,
        type: fileType,
        size: file.size,
        text: fileText,
      });
    } else {
      const formData = new FormData();
      formData.append("document", file);

      // Handle the file upload
      try {
        const response = await $fetch<{
          message: string;
          filename: string;
          size: number;
          chunksCount: number;
        }>("/api/file", {
          method: "POST",
          body: formData,
        });
        if (response) {
          const fileName = response.filename;
        } else {
          console.error("File upload failed");
        }
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = ""; // Clear the input value
  }
}

const emit = defineEmits<{
  (e: "fileUploaded", file: MessageFile): void;
}>();
</script>

<template>
  <input
    ref="fileInputRef"
    type="file"
    accept=".txt,.pdf"
    class="hidden"
    @change="handleFileChange"
  />
  <div
    aria-label="Upload file"
    tabindex="0"
    class="flex p-1 rounded-lg cursor-pointer focus-outline"
    @click="triggerFileInput"
    @keydown.enter="triggerFileInput"
    @keydown.space="triggerFileInput"
  >
    <Icon name="lucide:paperclip" class="cursor-pointer text-(--main-color)" />
  </div>
</template>
