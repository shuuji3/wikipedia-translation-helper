<script setup lang="ts">
interface TranslationBlock {
  id: string
  tagName: string
  html: string
  vault: string[]
}

const config = useRuntimeConfig()
const title = ref('')
const isFetching = ref(false)
const translatingId = ref<string | null>(null)
const selectedId = ref<string | null>(null)
const selectedTextSnippet = ref('')
const blocks = ref<TranslationBlock[]>([])
const translatedContent = ref<{ [key: string]: string }>({})
const bodyClass = ref('')

// Utility to inject Wikipedia styles into the app's head
function injectStyles(doc: Document) {
  bodyClass.value = doc.body.className

  const headElements = doc.querySelectorAll('link[rel="stylesheet"], style')
  headElements.forEach((el) => {
    const clone = el.cloneNode(true) as HTMLElement
    if (clone.tagName === 'LINK') {
      const href = clone.getAttribute('href')
      if (href && href.startsWith('/')) {
        clone.setAttribute('href', `https://en.wikipedia.org${href}`)
      }
    }
    const href = clone.getAttribute('href') || (clone.textContent ? 'inline-style' : '')
    const existing = document.head.querySelector(`[href="${href}"]`)
    if (!existing) {
      document.head.appendChild(clone)
    }
  })
}

async function fetchArticle() {
  if (!title.value || isFetching.value) return

  isFetching.value = true
  blocks.value = []
  selectedId.value = null
  selectedTextSnippet.value = ''
  translatedContent.value = {}
  bodyClass.value = ''
  
  try {
    const apiPath = `${window.location.origin}${config.app.baseURL}api/wiki/parse?title=${encodeURIComponent(title.value)}`
    const data = await $fetch<{ title: string; html: string }>(apiPath)
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(data.html, 'text/html')
    
    injectStyles(doc)
    
    const collectedBlocks: TranslationBlock[] = []
    function processContainer(container: Element) {
      Array.from(container.children).forEach((el) => {
        if (el.tagName === 'SECTION') {
          processContainer(el)
        } else {
          collectedBlocks.push({
            id: el.id || `block-${collectedBlocks.length}`,
            tagName: el.tagName,
            html: el.outerHTML,
            vault: []
          })
        }
      })
    }
    
    processContainer(doc.body)
    blocks.value = collectedBlocks
  } catch (error) {
    console.error('Failed to fetch article:', error)
    alert('Failed to fetch article. Please check the title and try again.')
  } finally {
    isFetching.value = false
  }
}

function prepareTranslationText(target: HTMLElement, blockVault: string[]): string {
  const clone = target.cloneNode(true) as HTMLElement
  blockVault.length = 0 // Clear the array

  // Handle all elements with 'typeof' (templates, refs, math, etc.)
  // and Wikilinks
  const specialElements = clone.querySelectorAll('[typeof], a[rel="mw:WikiLink"]')

  specialElements.forEach(el => {
    // Check if it's a Wikilink
    if (el.tagName === 'A' && el.getAttribute('rel') === 'mw:WikiLink') {
      const href = el.getAttribute('href') || ''
      const title = decodeURIComponent(href.replace(/^\.\//, '')).replace(/_/g, ' ')
      const label = el.textContent || ''
      const linkTag = `<wp_link title="${title}" ja="${title}">${label}</wp_link>`
      el.replaceWith(document.createTextNode(linkTag))
    } else if (el.hasAttribute('typeof')) {
      // It's a special Wikipedia element (Template, Ref, etc.)
      const index = blockVault.length
      blockVault.push(el.outerHTML)
      el.replaceWith(document.createTextNode(`<wp_element_${index} />`))
    }
  })

  return clone.textContent?.trim() || ''
}

async function finalizeTranslation(translatedText: string, blockVault: string[]): Promise<string> {
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
        // Option A: Japanese article exists! Create a proper <a> tag for Parsoid
        const replacement = `<a rel="mw:WikiLink" href="./${encodeURIComponent(data.jaTitle)}" title="${data.jaTitle}">${label}</a>`
        return { fullTag, replacement }
      } else {
        // Option B: No Japanese article yet. Create mw:Transclusion HTML for {{ill}}
        const dataMw = JSON.stringify({
          parts: [{
            template: {
              target: { wt: "Ill", href: "./Template:Ill" },
              params: {
                "1": { wt: jaTitleLLM },
                "2": { wt: "en" },
                "3": { wt: enTitle },
                "label": { wt: label }
              },
              i: 0
            }
          }]
        })
        const replacement = `<span typeof="mw:Transclusion" data-mw='${dataMw.replace(/'/g, "&apos;")}'>${label}</span>`
        return { fullTag, replacement }
      }
    } catch (e) {
      console.error('Langlink API failed for:', enTitle, e)
      return { fullTag, replacement: label }
    }
  }))

  // Apply link replacements
  replacements.forEach(({ fullTag, replacement }) => {
    finalized = finalized.replace(fullTag, replacement)
  })

  // 2. Restore wp_element placeholders from vault
  finalized = finalized.replace(/<wp_element_(\d+)\s*\/>/g, (match, index) => {
    return blockVault[parseInt(index)] || match
  })

  return finalized
}

async function handleBlockClick(block: TranslationBlock) {
  if (isFetching.value) return

  const id = block.id
  selectedId.value = id

  // Handle non-content tags (style, link, meta, etc.) automatically
  const nonContentTags = ['STYLE', 'LINK', 'META', 'NOSCRIPT']
  if (nonContentTags.includes(block.tagName)) {
    translatedContent.value[id] = block.html
    return
  }

  const el = document.getElementById(id)
  if (!el) return

  // Phase 4-1: Prepare text with placeholders for LLM
  const textWithPlaceholders = prepareTranslationText(el, block.vault)
  const plainText = el.textContent?.trim() || ''

  selectedTextSnippet.value = plainText.substring(0, 60) + (plainText.length > 60 ? '...' : '')

  console.log('🚀 Phase 4-1 Analysis:', {
    id,
    originalText: plainText,
    textWithPlaceholders: textWithPlaceholders,
    vaultSize: block.vault.length
  })

  if (translatedContent.value[id]) return
  if (translatingId.value === id) return

  translatingId.value = id
  try {
    const apiPath = `${window.location.origin}${config.app.baseURL}api/translate`
    const response = await $fetch<{ original: string; translated: string }>(apiPath, {
      method: 'POST',
      body: { text: textWithPlaceholders }
    })

    const finalized = await finalizeTranslation(response.translated, block.vault)
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

    <!-- Main Content: Parallel Row Layout -->
    <main class="flex-1 overflow-y-auto">
      <div v-if="isFetching" class="h-full flex items-center justify-center text-gray-400 bg-white">
        <div class="flex flex-col items-center gap-2">
          <span class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></span>
          <p>Fetching article from Wikipedia...</p>
        </div>
      </div>
      
      <div v-else-if="blocks.length > 0" :class="['flex flex-col', bodyClass]">
        <div 
          v-for="block in blocks" 
          :key="block.id" 
          class="flex border-b border-gray-100 min-h-[4rem] group hover:bg-blue-50/20 transition-colors cursor-pointer"
          :class="{ 'hidden': ['STYLE', 'LINK', 'META', 'NOSCRIPT'].includes(block.tagName) }"
          :data-selected="selectedId === block.id"
          @click="handleBlockClick(block)"
        >
          <!-- Left Column: English Original -->
          <div 
            class="w-1/2 p-6 bg-white border-r border-gray-100 prose max-w-none prose-slate relative"
          >
            <div v-html="block.html" class="wikipedia-content"></div>
            <!-- Selection indicator -->
            <div v-if="selectedId === block.id" class="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
          </div>

          <!-- Right Column: Japanese Translation -->
          <div class="w-1/2 p-6 bg-white prose max-w-none prose-slate relative">
            <!-- Loading State -->
            <div v-if="translatingId === block.id" class="flex flex-col gap-3">
              <div class="flex items-center gap-2 text-blue-600">
                <span class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                <span class="text-sm font-bold">Translating...</span>
              </div>
              <div class="space-y-2 opacity-20">
                <div class="h-3 bg-gray-400 rounded w-full"></div>
                <div class="h-3 bg-gray-400 rounded w-5/6"></div>
              </div>
            </div>

            <!-- Translation Content -->
            <div v-else-if="translatedContent[block.id]" class="relative">
              <div
                class="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap"
                v-html="translatedContent[block.id]"
              ></div>
            </div>

            <!-- Placeholder when not translated -->
            <div v-else class="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div 
                v-if="!['STYLE', 'LINK', 'META', 'NOSCRIPT'].includes(block.tagName)"
                class="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"
              >
                <span>Click to translate</span>
                <span class="text-lg">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="h-full flex items-center justify-center text-gray-400 bg-white min-h-[400px]">
        <div class="text-center">
          <p class="text-xl mb-2">Ready to Translate</p>
          <p class="text-sm">Enter a title above and click "Fetch" to start.</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
/* Basic Wikipedia content styling within blocks */
.wikipedia-content { line-height: 1.6; }
.wikipedia-content p, .wikipedia-content h2, .wikipedia-content h3, .wikipedia-content li {
  margin: 0;
}
.wikipedia-content h2 { font-size: 1.5rem; font-weight: bold; border-bottom: 1px solid #eee; margin-bottom: 0.5rem; }
.wikipedia-content h3 { font-size: 1.25rem; font-weight: bold; }

/* Selection highlight for the row */
[data-selected="true"] {
  background-color: rgba(59, 130, 246, 0.03);
}
</style>
