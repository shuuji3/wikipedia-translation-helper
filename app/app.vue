<script setup lang="ts">
const { blocks, isFetching, isBlocksLoading, bodyClass } = useWikipediaArticle()
const { progress } = useTranslation()

useHead({
  link: [
    {
      rel: 'stylesheet',
      // Use the raw URL without any pre-processing to avoid double-encoding of '&'
      href: 'https://en.wikipedia.org/w/load.php?lang=en&modules=mediawiki.skinning.content.parsoid%7Cmediawiki.skinning.interface%7Csite.styles&only=styles&skin=vector'
    }
  ],
  bodyAttrs: {
    class: computed(() => bodyClass.value)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <TheHeader />
    <div class="h-2 w-full bg-gray-200 overflow-hidden sticky top-[73px] z-10">
      <div 
        class="h-full bg-blue-600 transition-all duration-500 ease-out" 
        :style="{ width: progress + '%' }"
      ></div>
    </div>
    <main class="flex-1 overflow-y-auto">
      <ClientOnly>
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
      </ClientOnly>
    </main>
    <WikitextExporter v-if="blocks.length > 0" />
  </div>
</template>

<style>
/* Reset and basic layout only, no Wikipedia style overrides here */
body {
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
