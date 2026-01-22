<script setup lang="ts">
const { blocks, isFetching, bodyClass } = useWikipediaArticle()
</script>

<template>
  <div class="flex-1">
    <div v-if="isFetching" class="min-h-[60vh] py-20 flex items-center justify-center text-gray-400 bg-white">
      <div class="text-center">
        <span class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4 inline-block"></span>
        <p class="text-xl mb-2 text-gray-600">Fetching Article</p>
        <p class="text-sm">Retrieving content from Wikipedia Parsoid API...</p>
      </div>
    </div>
    
    <div v-else-if="blocks.length > 0" :class="['flex flex-col mw-parser-output', bodyClass]">
      <TranslationRow 
        v-for="block in blocks" 
        :key="block.id" 
        :block="block" 
      />
    </div>

    <div v-else class="min-h-[60vh] py-20 flex items-center justify-center text-gray-400 bg-white">
      <div class="text-center">
        <p class="text-xl mb-2 text-gray-600">Ready to Translate</p>
        <p class="text-sm">Enter a title above and click "Fetch" to start.</p>
      </div>
    </div>
  </div>
</template>
