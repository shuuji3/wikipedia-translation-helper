<script setup lang="ts">
const { blocks, isFetching } = useWikipediaArticle()

// If blocks already exist or we are fetching, we might have arrived here by mistake 
// or cleared the title. But generally, index is for selection.
</script>

<template>
  <div class="flex-1">
    <ArticleSelector />
  </div>
</template>
