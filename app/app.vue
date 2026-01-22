<script setup lang="ts">
const { blocks, isFetching } = useWikipediaArticle()
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <TheHeader />
    <main class="flex-1 overflow-y-auto">
      <template v-if="blocks.length > 0 || isFetching">
        <TranslationGrid />
      </template>
      <template v-else>
        <ArticleSelector />
      </template>
    </main>
    <WikitextExporter v-if="blocks.length > 0" />
  </div>
</template>

<style>
/* Global styles for Wikipedia layout */
body {
  margin: 0;
  padding: 0;
}
</style>
