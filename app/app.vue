<script setup lang="ts">
const { blocks, isFetching, isBlocksLoading } = useWikipediaArticle()
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <TheHeader />
    <main class="flex-1 overflow-y-auto">
      <div v-if="isBlocksLoading && !isFetching" class="flex items-center justify-center min-h-[50vh]">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p class="text-gray-500 font-medium">Loading your progress...</p>
        </div>
      </div>
      <template v-else-if="blocks.length > 0 || isFetching">
        <TranslationGrid />
      </template>
      <template v-else>
        <ArticleSelector />
      </template>
    </main>
    <WikitextExporter v-if="blocks.length > 0" />
  </div>
</template>
