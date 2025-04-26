<script setup lang="ts">
import type { Model, Usage } from "~/utils/db/local";

defineProps<{
  model?: Model;
  usage?: Usage;
}>();

const popupVisible = ref(false);
let hoverTimer: number | null = null;

function showPopupWithDelay() {
  hoverTimer = window.setTimeout(() => {
    popupVisible.value = true;
  }, 500);
}

function hidePopup() {
  if (hoverTimer !== null) window.clearTimeout(hoverTimer);
  popupVisible.value = false;
}

function roundToDecimalPlaces(number: number, decimalPlaces: number) {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(number * factor) / factor;
}

const infoRef = ref<HTMLElement | null>(null);
const { top } = useElementBounding(infoRef);
const { width, height } = useWindowSize();
const isNearBottom = computed(() => {
  return top.value > height.value - 250;
});
const isMobile = computed(() => {
  return width.value < 448;
});
</script>

<template>
  <div
    class="relative"
    @mouseenter="showPopupWithDelay"
    @click.prevent.stop="popupVisible = true"
    @mouseleave="hidePopup"
  >
    <div v-if="model" ref="infoRef" class="flex items-center gap-1">
      <Icon
        :name="getModelProviderIcon(model.provider)"
        class="text-(--main-color) scale-90"
      />
      <div class="text-(--main-color) text-sm">
        {{ model.displayName }}
      </div>
    </div>

    <!-- popup -->
    <div
      v-if="popupVisible && (usage || model)"
      ref="popupRef"
      class="absolute ml-2 bg-(--bg-color) border border-(--sub-color) rounded-lg shadow-lg max-h-60 z-10 overflow-y-auto p-1 text-sm text-nowrap grid gap-x-2 grid-cols-[min-content_min-content] chat-bubble-response-info-popup"
      :class="{
        'bottom-0': isNearBottom && !isMobile,
        'bottom-full': isNearBottom && isMobile,
        'top-0': !isNearBottom && !isMobile,
        'top-full': !isNearBottom && isMobile,
        'left-full': !isMobile,
        'left-0': isMobile,
      }"
    >
      <div class="text-right text-(--sub-color)">model:</div>
      <div>{{ model?.name }}</div>
      <div class="text-right text-(--sub-color)">provider:</div>
      <div>{{ model?.provider }}</div>
      <div v-if="model?.url" class="text-right text-(--sub-color)">url:</div>
      <div v-if="model?.url">{{ model?.url }}</div>
      <div class="text-right text-(--sub-color)">temperature:</div>
      <div>{{ usage?.temperature }}</div>
      <div class="text-right text-(--sub-color)">prompt tokens:</div>
      <div>{{ usage?.promptTokens }}</div>
      <div class="text-right text-(--sub-color)">completion tokens:</div>
      <div>{{ usage?.completionTokens }}</div>
      <div class="text-right text-(--sub-color)">total tokens:</div>
      <div>{{ usage?.totalTokens }}</div>
      <div v-if="usage?.loadDuration" class="text-right text-(--sub-color)">
        load time:
      </div>
      <div v-if="usage?.loadDuration">
        {{
          roundToDecimalPlaces(
            usage?.loadDuration ? usage.loadDuration / 10 ** 9 : 0,
            4,
          )
        }}s
      </div>
      <div class="text-right text-(--sub-color)">time to first token:</div>
      <div>
        {{
          roundToDecimalPlaces(
            usage?.timeToFirstToken ? usage.timeToFirstToken / 1000 : 0,
            4,
          )
        }}s
      </div>
      <div class="text-right text-(--sub-color)">completion time:</div>
      <div>
        {{
          roundToDecimalPlaces(
            usage?.completionTime ? usage.completionTime / 1000 : 0,
            4,
          )
        }}s
      </div>
      <div class="text-right text-(--sub-color)">tokens per second:</div>
      <div>
        {{
          roundToDecimalPlaces(
            usage?.tokensPerSecond ? usage.tokensPerSecond : 0,
            4,
          )
        }}
        tok/s
      </div>
      <div
        v-if="usage?.promptTokensDetails"
        class="text-right text-(--sub-color)"
      >
        cached tokens:
      </div>
      <div v-if="usage?.promptTokensDetails">
        {{ usage?.promptTokensDetails.cached_tokens }}
      </div>
      <div
        v-if="usage?.completionTokensDetails"
        class="text-right text-(--sub-color)"
      >
        reasoning tokens:
      </div>
      <div v-if="usage?.completionTokensDetails">
        {{ usage?.completionTokensDetails.reasoning_tokens }}
      </div>
    </div>
  </div>
</template>
