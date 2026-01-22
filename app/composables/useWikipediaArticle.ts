export interface TranslationBlock {
  id: string
  tagName: string
  html: string
  vault: string[]
}

export function useWikipediaArticle() {
  const config = useRuntimeConfig()
  
  // SHARED STATE: title is the entry point for article fetching.
  // Persist the last active title to allow resuming work after reload.
  const title = usePersistentState<string>(() => 'lastActiveTitle', '')

  /**
   * articleId is a normalized version of the title used for storage keys.
   */
  const articleId = computed(() => {
    if (!title.value) return null
    return title.value.trim().replace(/\s+/g, '_')
  })
  
  // PERSISTENT STATE: blocks are saved per articleId.
  const blocks = usePersistentState<TranslationBlock[]>(
    () => articleId.value ? `${articleId.value}:blocks` : null,
    []
  )

  const bodyClass = useState<string>('wikiBodyClass', () => '')
  const generatedWikitext = useState<string>('wikiGeneratedWikitext', () => '')
  // isFetching is shared between TheHeader and TranslationGrid
  const isFetching = useState<boolean>('wikiIsFetching', () => false)

  // LOCAL STATE (ref): Only used within the instance of this composable
  const isSerializing = ref(false)
  const isCopied = ref(false)

  async function fetchArticle() {
    if (!title.value || isFetching.value) return

    isFetching.value = true
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
    } catch (error) {
      console.error('Failed to fetch article:', error)
      alert('Failed to fetch article. Please check the title and try again.')
    } finally {
      isFetching.value = false
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
    bodyClass,
    isSerializing,
    generatedWikitext,
    isCopied,
    fetchArticle,
    generateWikitext,
    copyToClipboard
  }
}
