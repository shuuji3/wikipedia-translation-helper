<script setup lang="ts">
const { title, isFetching, fetchArticle, clearArticle, blocks } = useWikipediaArticle()
const { resetTranslation } = useTranslation()

async function handleFetch() {
  // If title is same and we already have blocks, no need to re-fetch unless explicitly asked
  // But for now, we keep the original logic for simplicity.
  resetTranslation()
  await fetchArticle()
}
</script>

<template>
  <header class="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
      <div
        class="brand-title flex items-center gap-2 cursor-pointer"
        @click="clearArticle"
      >
        <span>🌐</span>
        <span class="flex items-center">
          <span class="text-gray-400 font-normal">[[</span>
          <span>wikipedia-translation-helper</span>
          <span class="text-gray-400 font-normal">]]</span>
        </span>
      </div>

      <div class="flex-1 min-w-[300px] flex gap-2">
        <input
          v-model="title"
          type="text"
          placeholder="Enter Wikipedia article title (e.g., Quantum_mechanics)"
          class="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          @keyup.enter="handleFetch"
        />
        <button
          @click="handleFetch"
          :disabled="isFetching"
          class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span v-if="isFetching" class="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          {{ isFetching ? 'Fetching...' : 'Fetch' }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.brand-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin-right: 1rem;
  border-bottom: 1px solid #a2a9b1;
  padding-bottom: 2px;
  line-height: 1.2;
}
</style>
