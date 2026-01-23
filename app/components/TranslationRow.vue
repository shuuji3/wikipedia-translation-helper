<script setup lang="ts">
import type { TranslationBlock } from '~/composables/useWikipediaArticle'

const props = defineProps<{
  block: TranslationBlock
}>()

const { translateBlock, translatingId, selectedId, translatedContent } = useTranslation()
const { isFetching, bodyClass, updateSavedArticlesList } = useWikipediaArticle()

const isEditing = ref(false)

const isStyleTag = computed(() => props.block.tagName === 'STYLE')
const isHidden = computed(() => ['LINK', 'META', 'NOSCRIPT'].includes(props.block.tagName))

function handleClick(e: Event) {
  if (isFetching.value || isStyleTag.value) return

  // Prevent navigation if a link was clicked in the preview
  if (!isEditing.value) {
    e.preventDefault()
  }
  
  if (!translatedContent.value[props.block.id]) {
    translateBlock(props.block)
  } else {
    isEditing.value = true
  }
}

function handleClear(e: Event) {
  e.stopPropagation()
  if (confirm('Clear this translation?')) {
    delete translatedContent.value[props.block.id]
    isEditing.value = false
    updateSavedArticlesList()
  }
}

const editorRef = ref<HTMLElement | null>(null)

watch(isEditing, (val) => {
  if (val) {
    nextTick(() => {
      if (editorRef.value) {
        editorRef.value.innerHTML = translatedContent.value[props.block.id] || ''
        
        // Protect templates but keep normal links editable
        const protectable = editorRef.value.querySelectorAll('[typeof]')
        protectable.forEach(el => {
          el.setAttribute('contenteditable', 'false')
        })

        editorRef.value.focus()
      }
    })
  }
})

function handleBlur(e: Event) {
  const el = e.target as HTMLElement
  translatedContent.value[props.block.id] = el.innerHTML
  isEditing.value = false
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
      class="w-1/2 p-6 bg-white relative group hover:bg-blue-50/30 transition-all cursor-pointer"
      :class="{ 'ring-2 ring-blue-600 ring-inset z-10 shadow-lg': isEditing }"
      @click="handleClick"
    >
      <!-- Clear Button -->
      <button
        v-if="translatedContent[block.id] && !translatingId"
        @click.stop="handleClear"
        class="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-md opacity-0 group-hover:opacity-100 transition-all z-20"
        title="Clear translation"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

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
        <component
          :is="block.tagName"
          v-else
          ref="editorRef"
          contenteditable="true"
          class="w-full p-0 border-none focus:ring-0 bg-transparent overflow-hidden wikipedia-content-editor outline-none"
          @blur="handleBlur"
          @keydown.esc="isEditing = false"
        ></component>
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

/* Visual indicators for Wikipedia parts (Both in display and editor) */
:deep(.wikipedia-content) [rel="mw:WikiLink"],
:deep(.wikipedia-content-editor) [rel="mw:WikiLink"] {
  background-color: rgba(59, 130, 246, 0.12);
  border-bottom: 1px dashed rgba(59, 130, 246, 0.4);
  padding: 0 1px;
  border-radius: 2px;
}
:deep(.wikipedia-content) [typeof="mw:Transclusion"],
:deep(.wikipedia-content-editor) [typeof="mw:Transclusion"] {
  background-color: rgba(245, 158, 11, 0.12);
  border-bottom: 1px dashed rgba(245, 158, 11, 0.4);
  padding: 0 1px;
  border-radius: 2px;
}
:deep(.wikipedia-content) [typeof*="mw:Extension/ref"],
:deep(.wikipedia-content-editor) [typeof*="mw:Extension/ref"] {
  background-color: rgba(107, 114, 128, 0.1);
  padding: 0 2px;
  border-radius: 2px;
}

/* Ensure mouse events are captured for tooltips, but clicks are handled by handleClick */
:deep(.wikipedia-content) [rel="mw:WikiLink"],
:deep(.wikipedia-content) [typeof="mw:Transclusion"],
:deep(.wikipedia-content) [typeof*="mw:Extension/ref"] {
  pointer-events: auto;
}

/* Ensure cursor is text-style in editor even for links */
:deep(.wikipedia-content-editor),
:deep(.wikipedia-content-editor) [rel="mw:WikiLink"] {
  cursor: text;
}

/* Editor mode: make protected chips behave as solid selectable blocks */
:deep(.wikipedia-content-editor) [contenteditable="false"] {
  display: inline-block;
  vertical-align: baseline;
  cursor: default;
  user-select: all;
  pointer-events: auto;
}

[data-selected="true"] {
  background-color: rgba(59, 130, 246, 0.03);
}
</style>
