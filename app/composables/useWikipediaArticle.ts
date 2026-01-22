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

// Helper to normalize title
const getArticleId = (titleValue: string) => {
  if (!titleValue) return null
  return titleValue.trim().replace(/\s+/g, '_')
}

export function useWikipediaArticle() {
  const config = useRuntimeConfig()
  
  // Input title (volatile, what the user is typing)
  const title = useState<string>('wiki-input-title', () => '')
  
  // Active title (the article currently being translated)
  const activeTitle = useState<string>('wiki-active-title', () => '')
  
  // Persistent shared states
  const savedArticles = useState<ArticleMetadata[]>('wiki-saved-articles', () => [])
  const blocks = useState<TranslationBlock[]>('wiki-blocks', () => [])

  // Normalized ID for storage based on ACTIVE title
  const activeArticleId = computed(() => getArticleId(activeTitle.value))

  // Setup Persistence
  usePersistentState(activeTitle, () => 'lastActiveTitle', '')
  usePersistentState(savedArticles, () => 'savedArticlesList', [], true)
  
  const { isInitialLoading: isBlocksLoading } = usePersistentState(
    blocks, 
    () => activeArticleId.value ? `${activeArticleId.value}:blocks` : null,
    [],
    false
  )

  const bodyClass = useState<string>('wikiBodyClass', () => '')
  const generatedWikitext = useState<string>('wikiGeneratedWikitext', () => '')
  const isFetching = useState<boolean>('wikiIsFetching', () => false)
  const isSerializing = ref(false)
  const isCopied = ref(false)

  // Sync title input with activeTitle when activeTitle changes (for initial load/refresh)
  watch(activeTitle, (newVal) => {
    if (newVal && !title.value) {
      title.value = newVal
    }
  }, { immediate: true })

  function updateSavedArticlesList() {
    if (!activeArticleId.value || !activeTitle.value) return
    const now = Date.now()
    const list = [...savedArticles.value]
    const index = list.findIndex(a => a.id === activeArticleId.value)
    if (index !== -1) {
      list[index] = { ...list[index], updatedAt: now }
    } else {
      list.push({ id: activeArticleId.value, title: activeTitle.value, updatedAt: now })
    }
    list.sort((a, b) => b.updatedAt - a.updatedAt)
    savedArticles.value = list
  }

  async function fetchArticle() {
    if (!title.value || isFetching.value) return

    isFetching.value = true
    generatedWikitext.value = ''
    bodyClass.value = ''
    
    // Set activeTitle only when we actually fetch
    activeTitle.value = title.value
    
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
      alert('Failed to fetch article.')
    } finally {
      isFetching.value = false
    }
  }

  function loadArticleFromList(article: ArticleMetadata) {
    activeTitle.value = article.title
    title.value = article.title
  }

  function clearArticle() {
    activeTitle.value = ''
    title.value = ''
    blocks.value = []
    generatedWikitext.value = ''
  }

  async function removeArticle(id: string) {
    if (!confirm('Delete this article?')) return
    await storage.removeItem(`${id}:blocks`)
    await storage.removeItem(`${id}:translations`)
    savedArticles.value = savedArticles.value.filter(a => a.id !== id)
    if (activeArticleId.value === id) clearArticle()
  }

  async function generateWikitext(translatedContent: Record<string, string>) {
    if (blocks.value.length === 0 || isSerializing.value) return
    isSerializing.value = true
    try {
      const fullHtml = blocks.value.map(b => translatedContent[b.id] || b.html).join('')
      const response = await $fetch<{ wikitext: string }>(`${window.location.origin}${config.app.baseURL}api/wiki/serialize`, {
        method: 'POST',
        body: { html: fullHtml, title: activeTitle.value }
      })
      generatedWikitext.value = response.wikitext
      updateSavedArticlesList()
    } catch (error) {
      console.error('Serialization failed:', error)
    } finally {
      isSerializing.value = false
    }
  }

  function copyToClipboard() {
    if (!generatedWikitext.value || isCopied.value) return
    navigator.clipboard.writeText(generatedWikitext.value)
    isCopied.value = true
    setTimeout(() => { isCopied.value = false }, 2000)
  }

  return {
    title, activeTitle, isFetching, isBlocksLoading, blocks, savedArticles, bodyClass,
    isSerializing, generatedWikitext, isCopied,
    fetchArticle, loadArticleFromList, clearArticle, removeArticle, generateWikitext, copyToClipboard
  }
}
