<script setup lang="ts">
const config = useRuntimeConfig()
const title = ref('')
const isFetching = ref(false)
const translatingId = ref<string | null>(null)
const selectedId = ref<string | null>(null)
const selectedTextSnippet = ref('')
const originalHtml = ref('')
const translatedContent = ref<{ [key: string]: string }>({})
const vault = ref<string[]>([])

async function fetchArticle() {
  if (!title.value || isFetching.value) return

  isFetching.value = true
  originalHtml.value = ''
  selectedId.value = null
  selectedTextSnippet.value = ''
  translatedContent.value = {}
  vault.value = []
  try {
    const apiPath = `${window.location.origin}${config.app.baseURL}api/wiki/parse?title=${encodeURIComponent(title.value)}`
    const data = await $fetch<{ title: string; html: string }>(apiPath)
    originalHtml.value = data.html
  } catch (error) {
    console.error('Failed to fetch article:', error)
    alert('Failed to fetch article. Please check the title and try again.')
  } finally {
    isFetching.value = false
  }
}

function prepareTranslationText(target: HTMLElement): string {
  const clone = target.cloneNode(true) as HTMLElement
  const currentVault: string[] = []

  // Handle all elements with 'typeof' (templates, refs, math, etc.)
  // and Wikilinks
  const specialElements = clone.querySelectorAll('[typeof], a[rel="mw:WikiLink"]')

  specialElements.forEach(el => {
    // Check if it's a Wikilink
    if (el.tagName === 'A' && el.getAttribute('rel') === 'mw:WikiLink') {
      const href = el.getAttribute('href') || ''
      const title = decodeURIComponent(href.replace(/^\.\//, '')).replace(/_/g, ' ')
      const label = el.textContent || ''
      // Use XML-like tag with title and a placeholder for the proposed Japanese title
      // The LLM will be instructed to translate both the 'ja' attribute and the tag content
      const linkTag = `<wp_link title="${title}" ja="${title}">${label}</wp_link>`
      el.replaceWith(document.createTextNode(linkTag))
    } else if (el.hasAttribute('typeof')) {
      // It's a special Wikipedia element (Template, Ref, etc.)
      const index = currentVault.length
      currentVault.push(el.outerHTML)
      el.replaceWith(document.createTextNode(`<wp_element_${index} />`))
    }
  })

  vault.value = currentVault
  return clone.textContent?.trim() || ''
}

async function finalizeTranslation(translatedText: string): Promise<string> {
  let finalized = translatedText

  // 1. Convert wp_link tags using "Triple Magic" (API check + dynamic formatting)
  const linkRegex = /<wp_link title="([^"]+)" ja="([^"]+)">([^<]+)<\/wp_link>/g
  const matches = [...finalized.matchAll(linkRegex)]

  // Fetch langlinks for all found English titles in parallel
  const replacements = await Promise.all(matches.map(async (match) => {
    const [fullTag, enTitle, jaTitleLLM, label] = match
    try {
      const apiPath = `${window.location.origin}${config.app.baseURL}api/wiki/langlink?title=${encodeURIComponent(enTitle)}`
      const data = await $fetch<{ jaTitle: string | null }>(apiPath)

      if (data.jaTitle) {
        // Option A: Japanese article exists!
        const replacement = data.jaTitle === label ? `[[${data.jaTitle}]]` : `[[${data.jaTitle}|${label}]]`
        return { fullTag, replacement }
      } else {
        // Option B: No Japanese article yet. Use {{ill}}
        const replacement = `{{ill|${jaTitleLLM}|en|${enTitle}|label=${label}}}`
        return { fullTag, replacement }
      }
    } catch (e) {
      console.error('Langlink API failed for:', enTitle, e)
      // Fallback to LLM's proposed jaTitle as a simple link
      return { fullTag, replacement: jaTitleLLM === label ? `[[${jaTitleLLM}]]` : `[[${jaTitleLLM}|${label}]]` }
    }
  }))

  // Apply link replacements
  replacements.forEach(({ fullTag, replacement }) => {
    finalized = finalized.replace(fullTag, replacement)
  })

  // 2. Restore wp_element placeholders from vault
  // Using a more robust regex to handle potential extra spaces around the tag
  finalized = finalized.replace(/<wp_element_(\d+)\s*\/>/g, (match, index) => {
    return vault.value[parseInt(index)] || match
  })

  return finalized
}

async function handlePaneClick(event: MouseEvent) {
  const target = (event.target as HTMLElement).closest('p, h2, h3, li') as HTMLElement
  if (!target || isFetching.value) return

  const id = target.id

  // Update selection highlight
  if (selectedId.value) {
    const prev = document.getElementById(selectedId.value)
    if (prev) prev.removeAttribute('data-selected')
  }
  selectedId.value = id
  target.setAttribute('data-selected', 'true')

  // Phase 4-1: Prepare text with placeholders for LLM
  const textWithPlaceholders = prepareTranslationText(target)
  const plainText = target.textContent?.trim() || ''

  // Set snippet for the loading view
  selectedTextSnippet.value = plainText.substring(0, 60) + (plainText.length > 60 ? '...' : '')

  console.log('🚀 Phase 4-1 Analysis:', {
    id,
    originalText: plainText,
    textWithPlaceholders: textWithPlaceholders,
    vaultSize: vault.value.length
  })

  // If already translated, just select it
  if (translatedContent.value[id]) {
    return
  }

  // Start translation if not already in progress
  if (translatingId.value === id) return

  translatingId.value = id
  try {
    const apiPath = `${window.location.origin}${config.app.baseURL}api/translate`
    const response = await $fetch<{ original: string; translated: string }>(apiPath, {
      method: 'POST',
      body: { text: textWithPlaceholders }
    })

    const finalized = await finalizeTranslation(response.translated)
    translatedContent.value[id] = finalized
  } catch (error) {
    console.error('Translation failed:', error)
  } finally {
    translatingId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <!-- Header: Search and Control -->
    <header class="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
        <h1 class="text-xl font-bold text-gray-800 mr-4">wikipedia-translation-helper</h1>
        <div class="flex-1 min-w-[300px] flex gap-2">
          <input
            v-model="title"
            type="text"
            placeholder="Enter Wikipedia article title (e.g., Quantum_mechanics)"
            class="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            @keyup.enter="fetchArticle"
          />
          <button
            @click="fetchArticle"
            :disabled="isFetching"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="isFetching" class="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            {{ isFetching ? 'Fetching...' : 'Fetch' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content: Dual Pane Layout -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Left Pane: Original Article -->
      <section class="w-1/2 border-r border-gray-200 flex flex-col bg-white">
        <header class="p-6 pb-0 flex-none">
          <h2 class="text-2xl font-bold border-b pb-2">Original (English)</h2>
        </header>
        <div class="flex-1 overflow-y-auto p-6 pt-4">
          <div v-if="isFetching" class="h-full flex items-center justify-center text-gray-400">
            <div class="flex flex-col items-center gap-2">
              <span class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></span>
              <p>Fetching article from Wikipedia...</p>
            </div>
          </div>
          <div v-else-if="originalHtml" class="prose max-w-none prose-slate">
            <div
              v-html="originalHtml"
              class="wikipedia-content"
              @click="handlePaneClick"
            ></div>
          </div>
          <div v-else class="h-full flex items-center justify-center text-gray-400">
            <p>Enter a title and click "Fetch" to start translating.</p>
          </div>
        </div>
      </section>

      <!-- Right Pane: Translation View -->
      <section class="w-1/2 flex flex-col bg-gray-50">
        <header class="p-6 pb-0 flex-none">
          <h2 class="text-2xl font-bold border-b pb-2 text-gray-700">Translation (Japanese)</h2>
        </header>
        <div class="flex-1 overflow-y-auto p-6 pt-4">
          <div class="prose max-w-none prose-slate h-full flex flex-col">
            <div v-if="originalHtml">
              <!-- Translation Loading or Result -->
              <div v-if="selectedId" class="mb-8">
                <!-- Loading State -->
                <div v-if="translatingId === selectedId" class="p-6 bg-white border border-gray-200 rounded-lg shadow-sm border-l-4 border-l-blue-500">
                  <div class="flex items-center gap-3 mb-4">
                    <span class="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                    <p class="text-sm font-semibold text-gray-700 m-0">Translating...</p>
                  </div>
                  <blockquote class="border-none p-0 m-0 italic text-gray-500 text-sm">
                    "{{ selectedTextSnippet }}"
                  </blockquote>
                  <div class="mt-4 space-y-2 opacity-20">
                    <div class="h-3 bg-gray-400 rounded w-full"></div>
                    <div class="h-3 bg-gray-400 rounded w-5/6"></div>
                    <div class="h-3 bg-gray-400 rounded w-4/6"></div>
                  </div>
                </div>

                <!-- Translation Result -->
                <div v-else-if="translatedContent[selectedId]" class="p-6 bg-white border border-gray-200 rounded-lg shadow-sm border-l-4 border-l-green-500">
                  <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 m-0">Translation</h3>
                  <div
                    class="text-lg text-gray-800 leading-relaxed m-0 whitespace-pre-wrap"
                    v-html="translatedContent[selectedId]"
                  ></div>
                </div>
              </div>

              <p v-else class="text-sm text-gray-500 italic mb-4">Click a paragraph on the left to start translating.</p>
            </div>
            <div v-else class="flex-1 flex items-center justify-center text-gray-400">
              <p>Translations will appear here.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style>
.wikipedia-content { line-height: 1.6; }
.wikipedia-content p, .wikipedia-content h2, .wikipedia-content h3, .wikipedia-content li {
  padding: 0.25rem 0.5rem; margin-left: -0.5rem; margin-right: -0.5rem; border-radius: 0.25rem; transition: background-color 0.2s; cursor: pointer;
}
.wikipedia-content p:hover, .wikipedia-content h2:hover, .wikipedia-content h3:hover, .wikipedia-content li:hover { background-color: rgba(59, 130, 246, 0.1); }
.wikipedia-content [data-selected="true"] { background-color: rgba(59, 130, 246, 0.15) !important; box-shadow: inset 4px 0 0 0 #2563eb; }
.wikipedia-content p { margin-bottom: 1rem; }
</style>
