<script setup lang="ts">
const { blocks, isSerializing, generatedWikitext, isCopied, generateWikitext, copyToClipboard } = useWikipediaArticle()
const { translatedContent } = useTranslation()

const isExpanded = ref(false)

const hasTranslations = computed(() => Object.keys(translatedContent.value).length > 0)

function handleGenerate() {
  generateWikitext(translatedContent.value)
  isExpanded.value = true
}

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <section 
    v-if="blocks.length > 0" 
    id="wikitext-output" 
    class="sticky bottom-0 z-20 bg-gray-100 border-t border-gray-300 transition-all duration-300"
    :class="[isExpanded ? 'h-80' : 'h-16']"
  >
    <div class="max-w-7xl mx-auto h-full flex flex-col">
      <!-- Toolbar -->
      <div class="h-16 px-8 flex items-center justify-between flex-shrink-0">
        <div 
          @click="toggleExpand"
          class="flex items-center gap-3 cursor-pointer group"
        >
          <div 
            class="w-6 h-6 rounded-full bg-gray-200 group-hover:bg-gray-300 flex items-center justify-center transition-all duration-300"
          >
            <svg 
              class="w-4 h-4 text-gray-600 transition-transform duration-300"
              :class="{ 'rotate-180': isExpanded }"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
            Wikitext Output
          </h2>
        </div>

        <div class="flex items-center gap-2">
          
          <button
            @click="handleGenerate"
            :disabled="isSerializing || !hasTranslations"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="isSerializing" class="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            {{ isSerializing ? 'Generating...' : 'Generate' }}
          </button>
          
          <button
            @click="copyToClipboard"
            :disabled="!generatedWikitext || !hasTranslations"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2 min-w-[100px] justify-center"
          >
              {{ isCopied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </div>

      <!-- Expanded Content -->
      <div v-if="isExpanded && generatedWikitext" class="flex-1 p-8 pt-0 overflow-hidden flex flex-col">
        <div class="flex-1 bg-white border border-gray-300 rounded-md shadow-inner overflow-hidden">
          <textarea
            readonly
            class="w-full h-full p-4 font-mono text-sm focus:outline-none bg-gray-50/50 resize-none"
            :value="generatedWikitext"
          ></textarea>
        </div>
      </div>
    </div>
  </section>
</template>
