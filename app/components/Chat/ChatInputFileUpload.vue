<script setup lang="ts">
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
    const chatStore = useChatStore();
    if (!chatStore.currentChatId) return;

    const file = fileInput.files[0] as File;
    const formData = new FormData();

    formData.append("document", file);
    formData.append("chatId", chatStore.currentChatId);

    // Handle the file upload
    try {
      const response = await fetch("/api/rag/document", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = ""; // Clear the input value
  }
}
</script>

<template>
  <input
    ref="fileInputRef"
    type="file"
    accept=".txt,.pdf"
    class="hidden"
    @change="handleFileChange"
  />
  <button
    aria-label="Upload file"
    class="p-1! rounded-lg"
    @click="triggerFileInput"
  >
    <Icon name="lucide:paperclip" class="cursor-pointer text-(--main-color)" />
  </button>
</template>
