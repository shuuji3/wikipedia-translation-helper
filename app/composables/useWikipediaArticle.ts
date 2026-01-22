export interface TranslationBlock {
  id: string
  tagName: string
  html: string
  vault: string[]
}

export interface ArticleMetadata {
  id: string
  title: string
  updatedAt: number
}

// SINGLETON STATE: Defined outside the composable function to prevent redundant watchers
// These will be initialized once and shared across all components.
const _title = () => usePersistentState<string>('wiki-title', () => 'lastActiveTitle', '')
const _savedArticles = () => usePersistentState<ArticleMetadata[]>('wiki-saved-articles', () => 'savedArticlesList', [])

/**
 * articleId is a normalized version of the title used for storage keys.
 */
const getArticleId = (titleValue: string) => {
  if (!titleValue) return null
  return titleValue.trim().replace(/\s+/g, '_')
}

const _blocks = (titleRef: Ref<string>) => usePersistentState<TranslationBlock[]>(
  'wiki-blocks',
  () => {
    const aid = getArticleId(titleRef.value)
    return aid ? `${aid}:blocks` : null
  },
  []
)

export function useWikipediaArticle() {
  const config = useRuntimeConfig()
  
  const title = _title()
  const savedArticles = _savedArticles()
  const blocks = _blocks(title)

  const articleId = computed(() => getArticleId(title.value))

  const bodyClass = useState<string>('wikiBodyClass', () => '')
  const generatedWikitext = useState<string>('wikiGeneratedWikitext', () => '')
  const isFetching = useState<boolean>('wikiIsFetching', () => false)

  const isSerializing = ref(false)
  const isCopied = ref(false)

  function updateSavedArticlesList() {
    if (!articleId.value || !title.value) return

    const now = Date.now()
    const index = savedArticles.value.findIndex(a => a.id === articleId.value)
    
    if (index !== -1) {
      savedArticles.value[index] = { ...savedArticles.value[index], updatedAt: now }
    } else {
      savedArticles.value.push({
        id: articleId.value,
        title: title.value,
        updatedAt: now
      })
    }
    savedArticles.value.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async function fetchArticle() {
    if (!title.value || isFetching.value) return

    isFetching.value = true
    // Clear current blocks before fetching, but this will be overridden by the fresh data
    blocks.value = []
    generatedWikitext.value = ''
    bodyClass.value = ''
    
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const apiPath = `${origin}${config.app.baseURL}api/wiki/parse?title=${encodeURIComponent(title.value)}`
      const data = await $fetch<{ title: string; html: string }>(apiPath)
      
      const parser = new DOMParser()
      const doc = parser.parseFromString(data.html, 'text/html')
      
      injectStyles(doc, bodyClass)
      
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
      updateSavedArticlesList()
    } catch (error) {
      console.error('Failed to fetch article:', error)
      alert('Failed to fetch article. Please check the title and try again.')
    } finally {
      isFetching.value = false
    }
  }

  function clearArticle() {
    title.value = ''
    blocks.value = []
    generatedWikitext.value = ''
  }

  async function removeArticle(id: string) {
    if (!confirm('Are you sure you want to delete this article? All translation progress will be lost.')) return

    try {
      await storage.removeItem(`${id}:blocks`)
      await storage.removeItem(`${id}:translations`)
      savedArticles.value = savedArticles.value.filter(a => a.id !== id)
      if (articleId.value === id) {
        clearArticle()
      }
    } catch (e) {
      console.error('Failed to remove article:', e)
    }
  }

  async function generateWikitext(translatedContent: Record<string, string>) {
    if (blocks.value.length === 0 || isSerializing.value) return

    isSerializing.value = true
    generatedWikitext.value = ''

    try {
      const fullHtml = blocks.value
        .map((block) => translatedContent[block.id] || block.html)
        .join('')

      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const apiPath = `${origin}${config.app.baseURL}api/wiki/serialize`
      const response = await $fetch<{ wikitext: string }>(apiPath, {
        method: 'POST',
        body: { 
          html: fullHtml,
          title: title.value
        }
      })

      generatedWikitext.value = response.wikitext
      updateSavedArticlesList()
      
      nextTick(() => {
        const el = document.getElementById('wikitext-output')
        el?.scrollIntoView({ behavior: 'smooth' })
      })
    } catch (error) {
      console.error('Serialization failed:', error)
      alert('Failed to generate Wikitext. Check the console for details.')
    } finally {
      isSerializing.value = false
    }
  }

  function copyToClipboard() {
    if (!generatedWikitext.value || isCopied.value) return
    navigator.clipboard.writeText(generatedWikitext.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  }

  return {
    title,
    isFetching,
    blocks,
    savedArticles,
    bodyClass,
    isSerializing,
    generatedWikitext,
    isCopied,
    fetchArticle,
    clearArticle,
    removeArticle,
    generateWikitext,
    copyToClipboard
  }
}
