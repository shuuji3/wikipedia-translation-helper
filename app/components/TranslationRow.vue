<script setup lang="ts">
import type { TranslationBlock } from '~/composables/useWikipediaArticle'

const props = defineProps<{
  block: TranslationBlock
}>()

const { translateBlock, translatingId, selectedId, translatedContent } = useTranslation()
const { isFetching, bodyClass } = useWikipediaArticle()

const isEditing = ref(false)

const isStyleTag = computed(() => props.block.tagName === 'STYLE')
const isHidden = computed(() => ['LINK', 'META', 'NOSCRIPT'].includes(props.block.tagName))

function handleClick() {
  if (isFetching.value || isStyleTag.value) return
  
  if (!translatedContent.value[props.block.id]) {
    translateBlock(props.block)
  } else {
    isEditing.value = true
  }
}

const textareaRef = ref<HTMLTextAreaElement | null>(null)

watch(isEditing, (val) => {
  if (val) {
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.focus()
        adjustTextareaHeight()
      }
    })
  }
})

function adjustTextareaHeight() {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px'
  }
}

function handleInput() {
  adjustTextareaHeight()
}
</script>

<template>
  <!-- Render STYLE tags directly to ensure Wikipedia styles are active -->
  <div v-if="isStyleTag" v-html="block.html"></div>

  <div 
    v-else-if="!isHidden"
    class="flex border-b border-gray-100 min-h-[4rem]"
    :data-selected="selectedId === block.id"
  >
    <!-- Left Column: English Original -->
    <div 
      class="w-1/2 p-6 bg-white border-r border-gray-100 relative"
    >
      <div v-html="block.html" class="wikipedia-content"></div>
      <div v-if="selectedId === block.id" class="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
    </div>

    <!-- Right Column: Japanese Translation -->
    <div 
      class="w-1/2 p-6 bg-white relative group hover:bg-blue-50/30 transition-colors cursor-pointer"
      @click="handleClick"
    >
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
        <div v-if="!isEditing" class="wikipedia-content">
          <component
            :is="block.tagName"
            v-html="translatedContent[block.id]"
          ></component>
        </div>
        <textarea
          v-else
          ref="textareaRef"
          v-model="translatedContent[block.id]"
          @blur="isEditing = false"
          @keydown.esc="isEditing = false"
          @input="handleInput"
          class="w-full p-0 border-none focus:ring-0 bg-transparent resize-none overflow-hidden wikipedia-content-editor"
        ></textarea>
      </div>

      <!-- Placeholder when not translated -->
      <div v-else class="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div class="text-sm font-bold text-blue-600 flex items-center gap-2">
          <span>Click to translate</span>
          <span class="text-lg">→</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wikipedia-content, .wikipedia-content-editor { 
  line-height: 1.6;
  font-family: inherit;
  font-size: 1rem;
}
.wikipedia-content-editor {
  display: block;
  width: 100%;
}
:deep(.wikipedia-content) p, 
:deep(.wikipedia-content) h2, 
:deep(.wikipedia-content) h3 {
  margin: 0;
}
:deep(.wikipedia-content) h2 { font-size: 1.5rem; font-weight: bold; border-bottom: 1px solid #eee; margin-top: 1rem; margin-bottom: 0.5rem; }
:deep(.wikipedia-content) h3 { font-size: 1.25rem; font-weight: bold; margin-top: 0.75rem; }

/* Restore list styles removed by Tailwind Preflight */
:deep(.wikipedia-content) ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}
:deep(.wikipedia-content) ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}
:deep(.wikipedia-content) li {
  margin-bottom: 0.25rem;
  display: list-item; /* Ensure it behaves like a list item */
}

[data-selected="true"] {
  background-color: rgba(59, 130, 246, 0.03);
}
</style>
