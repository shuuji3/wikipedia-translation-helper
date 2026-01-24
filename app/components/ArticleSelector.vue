<script setup lang="ts">
import type { ArticleMetadata } from '../composables/useWikipediaArticle'

const { savedArticles, loadArticleFromList, removeArticle } = useWikipediaArticle()

async function loadArticle(article: ArticleMetadata) {
  loadArticleFromList(article)
  await navigateTo(`/${encodeURIComponent(article.title)}`)
}

function handleDelete(e: Event, id: string) {
  e.stopPropagation()
  removeArticle(id)
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <div v-if="savedArticles.length === 0" class="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
      <div class="text-gray-400 mb-4 text-5xl"></div>
      <p class="text-gray-500 text-lg">No articles in progress yet.</p>
      <p class="text-gray-400">Enter a Wikipedia title in the header to start a new translation!</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div 
        v-for="article in savedArticles" 
        :key="article.id"
        class="group bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative"
        @click="loadArticle(article)"
      >
        <button 
          @click="handleDelete($event, article.id)"
          class="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete article"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <div>
          <h3 class="font-bold text-lg text-gray-900 mb-1 truncate pr-8">{{ article.title }}</h3>
          <p class="text-sm text-gray-500 mb-4">Last active: {{ formatDate(article.updatedAt) }}</p>
        </div>
        <div class="flex items-center text-blue-600 font-medium text-sm">
          Resume Translation
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
