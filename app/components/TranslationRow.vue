<script setup lang="ts">
import type { TranslationBlock } from '~/composables/useWikipediaArticle'

const props = defineProps<{
  block: TranslationBlock
}>()

const { translateBlock, translatingId, selectedId, translatedContent } = useTranslation()
const { isFetching } = useWikipediaArticle()

const nonContentTags = ['STYLE', 'LINK', 'META', 'NOSCRIPT']
const isHidden = computed(() => nonContentTags.includes(props.block.tagName))

function handleClick() {
  if (isFetching.value) return
  translateBlock(props.block)
}
</script>

<template>
  <div 
    v-if="!isHidden"
    class="flex border-b border-gray-100 min-h-[4rem] group hover:bg-blue-50/20 transition-colors cursor-pointer"
    :data-selected="selectedId === block.id"
    @click="handleClick"
  >
    <!-- Left Column: English Original -->
    <div class="w-1/2 p-6 bg-white border-r border-gray-100 prose max-w-none prose-slate relative">
      <div v-html="block.html" class="wikipedia-content"></div>
      <div v-if="selectedId === block.id" class="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
    </div>

    <!-- Right Column: Japanese Translation -->
    <div class="w-1/2 p-6 bg-white prose max-w-none prose-slate relative">
      <!-- Loading State -->
      <div v-if="translatingId === block.id" class="flex flex-col gap-3">
        <div class="items-center flex gap-2 text-blue-600">
          <span class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></span>
          <span class="text-sm font-bold">Translating...</span>
        </div>
        <div class="space-y-2 opacity-20">
          <div class="h-3 bg-gray-400 rounded w-full"></div>
          <div class="h-3 bg-gray-400 rounded w-5/6"></div>
        </div>
      </div>

      <!-- Translation Content -->
      <div v-else-if="translatedContent[block.id]" class="relative">
        <div class="wikipedia-content">
          <component
            :is="block.tagName"
            v-html="translatedContent[block.id]"
          ></component>
        </div>
      </div>

      <!-- Placeholder when not translated -->
      <div v-else class="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div class="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
          <span>Click to translate</span>
          <span class="text-lg">→</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wikipedia-content { line-height: 1.6; }
:deep(.wikipedia-content) p, 
:deep(.wikipedia-content) h2, 
:deep(.wikipedia-content) h3, 
:deep(.wikipedia-content) li {
  margin: 0;
}
:deep(.wikipedia-content) h2 { font-size: 1.5rem; font-weight: bold; border-bottom: 1px solid #eee; margin-bottom: 0.5rem; }
:deep(.wikipedia-content) h3 { font-size: 1.25rem; font-weight: bold; }

[data-selected="true"] {
  background-color: rgba(59, 130, 246, 0.03);
}
</style>
