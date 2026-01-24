<script setup lang="ts">
const route = useRoute()
const titleParam = computed(() => route.params.title as string)
const { blocks, isFetching, isBlocksLoading, fetchArticle, title, activeTitle } = useWikipediaArticle()

// Sync route param with title state and fetch if needed
watch(titleParam, (newTitle) => {
  if (newTitle && newTitle !== activeTitle.value) {
    title.value = newTitle
    fetchArticle()
  }
}, { immediate: true })

// If we have no blocks and no fetching is happening, but we have a title, try fetching
onMounted(() => {
  if (titleParam.value && blocks.value.length === 0 && !isFetching.value) {
    title.value = titleParam.value
    fetchArticle()
  }
})
</script>

<template>
  <div class="flex-1">
    <div v-if="isBlocksLoading && !isFetching" class="flex items-center justify-center min-h-[50vh]">
      <div class="flex flex-col items-center gap-4">
        <div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <p class="text-gray-500 font-medium">Loading your progress...</p>
      </div>
    </div>
    <template v-else-if="blocks.length > 0 || isFetching">
      <TranslationGrid />
      <WikitextExporter />
    </template>
    <div v-else class="flex items-center justify-center min-h-[50vh]">
      <div class="text-center">
        <p class="text-gray-500 mb-4">No article loaded.</p>
        <NuxtLink to="/" class="text-blue-600 hover:underline">Go back to selector</NuxtLink>
      </div>
    </div>
  </div>
</template>
