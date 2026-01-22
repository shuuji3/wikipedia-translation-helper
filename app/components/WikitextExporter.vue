<script setup lang="ts">
const { blocks, isSerializing, generatedWikitext, isCopied, generateWikitext, copyToClipboard } = useWikipediaArticle()
const { translatedContent } = useTranslation()

function handleGenerate() {
  generateWikitext(translatedContent.value)
}
</script>

<template>
  <section v-if="blocks.length > 0" id="wikitext-output" class="bg-gray-100 border-t border-gray-300 p-8">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-800">Wikitext Output</h2>
        <div class="flex gap-2">
          <button
            @click="handleGenerate"
            :disabled="isSerializing"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="isSerializing" class="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            {{ isSerializing ? 'Generating...' : 'Generate' }}
          </button>
          <button
            @click="copyToClipboard"
            :disabled="!generatedWikitext"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-2 min-w-[100px] justify-center"
          >
              {{ isCopied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </div>
      <div v-if="generatedWikitext" class="bg-white border border-gray-300 rounded-md shadow-inner overflow-hidden">
        <textarea
          readonly
          class="w-full h-96 p-4 font-mono text-sm focus:outline-none bg-gray-50/50"
          :value="generatedWikitext"
        ></textarea>
      </div>
    </div>
  </section>
</template>
