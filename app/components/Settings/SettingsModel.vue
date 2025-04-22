<script setup lang="ts">
const userSettingsStore = useUserSettingsStore();
const systemPrompt = computed({
  get: () => userSettingsStore.settings.defaultSystemPrompt,
  set: (value) => {
    userSettingsStore.updateSettings({ defaultSystemPrompt: value });
  },
});

// Autorezize the textarea
function resizeTextarea() {
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto";

    const newHeight = textareaRef.value.scrollHeight + 10;
    textareaRef.value.style.height = `${newHeight}px`;
  }
}

onMounted(() => {
  resizeTextarea();
});

const additionalPrompts = computed(
  () => userSettingsStore.settings.systemPrompts || {},
);
const newPromptTitle = ref("");
const newPromptValue = ref("");

function addSystemPrompt() {
  if (!newPromptTitle.value.trim() || !newPromptValue.value.trim()) return;
  // avoid overwriting existing keys unless you want that
  const updated = {
    ...additionalPrompts.value,
    [newPromptTitle.value.trim()]: newPromptValue.value,
  };
  userSettingsStore.updateSettings({ systemPrompts: updated });
  newPromptTitle.value = "";
  newPromptValue.value = "";
}

function deleteSystemPrompt(key: string) {
  const { [key]: _, ...rest } = additionalPrompts.value;
  userSettingsStore.updateSettings({ systemPrompts: rest });

  if (userSettingsStore.settings.currentSystemPrompt === key) {
    userSettingsStore.updateSettings({ currentSystemPrompt: "default" });
  }
}

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const globalSettingsStore = useGlobalSettingsStore();
</script>
<template>
  <div class="w-full">
    <SettingsGroup title="parameters" icon="lucide:braces">
      <SettingsSubGroup
        title="default system prompt"
        icon="lucide:letter-text"
        description="saves automatically"
      >
        <textarea
          ref="textareaRef"
          v-model="systemPrompt"
          placeholder="Enter your system prompt here"
          class="w-full resize-y max-h-[500px] rounded-lg bg-(--sub-alt-color) p-2"
          @input="resizeTextarea"
        ></textarea>
      </SettingsSubGroup>
      <SettingsSubGroup
        title="additional system prompts"
        icon="lucide:list-plus"
        description="add additional system prompts. they will be available in the chat input."
      >
        <div
          class="w-full h-[300px] grid grid-rows-[min-content_1fr] grid-cols-[1fr_2fr_min-content] gap-4"
        >
          <div class="flex gap-2">
            <input v-model="newPromptTitle" placeholder="title" class="grow" />
          </div>
          <textarea
            v-model="newPromptValue"
            placeholder="prompt"
            class="col-start-2 row-start-1 row-span-2"
          />
          <div class="w-full flex flex-col gap-2 overflow-y-auto">
            <div v-for="key in Object.keys(additionalPrompts)" :key="key">
              <div class="w-full flex gap-2 justify-between items-center">
                <div
                  :class="[
                    'font-semibold cursor-pointer',
                    newPromptTitle === key
                      ? 'text-(--main-color)'
                      : 'text-(--sub-color)',
                  ]"
                  @click="
                    () => {
                      newPromptTitle = key;
                      newPromptValue = additionalPrompts[key] || '';
                    }
                  "
                >
                  {{ key }}
                </div>
                <button
                  class="bg-(--error-color) text-(--bg-color) rounded-lg"
                  @click="deleteSystemPrompt(key)"
                >
                  <Icon
                    name="lucide:trash-2"
                    class="text-(--bg-color) scale-125"
                  />
                </button>
              </div>
            </div>
          </div>
          <button
            class="bg-(--main-color) text-(--bg-color) rounded-lg col-start-3 row-start-1 row-span-2"
            @click="addSystemPrompt"
          >
            <Icon name="lucide:plus" class="text-(--bg-color) scale-125" />
          </button>
        </div>
      </SettingsSubGroup>
      <SettingsSubGroup
        title="title model"
        icon="lucide:tag"
        description="choose the model to generate titles for your chats. 'same' will use the same model as the chat."
      >
        <SettingsSelectItem
          :value="
            !userSettingsStore.settings.titleModel
              ? 'same'
              : userSettingsStore.settings.titleModel.name
          "
          :options="[
            'same',
            ...globalSettingsStore.settings.availableModels.map((m) => m.name),
          ]"
          class="w-full"
          @select="
            (value) => {
              if (value === 'same') {
                userSettingsStore.updateSettings({ titleModel: undefined });
                return;
              }
              const model = globalSettingsStore.settings.availableModels.find(
                (m) => m.name === value,
              );
              userSettingsStore.updateSettings({ titleModel: model });
            }
          "
        />
      </SettingsSubGroup>
    </SettingsGroup>
  </div>
</template>
