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

  // Persistent body class for the article
  const bodyClass = useState<string>('wiki-body-class', () => '')
  usePersistentState(
    bodyClass,
    () => activeArticleId.value ? `${activeArticleId.value}:body-class` : null,
    ''
  )

  // Persistent article-specific styles
  const articleStyles = useState<string[]>('wiki-article-styles', () => [])
  usePersistentState(
    articleStyles,
    () => activeArticleId.value ? `${activeArticleId.value}:article-styles` : null,
    [],
    true
  )

  // Mapping for reference content (ID/Name -> Content)
  const referenceMap = useState<Record<string, string>>('wiki-reference-map', () => ({}))
  const { isInitialLoading: isRefMapLoading } = usePersistentState(
    referenceMap,
    () => activeArticleId.value ? `${activeArticleId.value}:reference-map` : null,
    {},
    true
  )

  // Watch for refMap loading to debug
  watch(isRefMapLoading, (loading) => {
    if (!loading) {
      console.log(`[DEBUG] referenceMap loaded from storage. Entries: ${Object.keys(referenceMap.value).length}`)
    }
  })

  // Force immediate save for activeTitle to ensure navigation is persisted before reload
  watch(activeTitle, (newVal) => {
    if (import.meta.client) {
      storage.setItem('lastActiveTitle', newVal).catch(console.error)
    }
  })

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
      const existing = list[index]!
      list[index] = { ...existing, updatedAt: now }
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
      bodyClass.value = doc.body.className
      articleStyles.value = extractStyles(doc)
      
      // Extract all references to the map
      const collectedRefs: Record<string, string> = {}
      const allElementsWithTypeof = doc.querySelectorAll('[typeof]')
      
      allElementsWithTypeof.forEach((el) => {
        const typeofAttr = el.getAttribute('typeof') || ''
        const dataMwAttr = el.getAttribute('data-mw')
        
        if (dataMwAttr && (dataMwAttr.includes('"name":"ref"') || typeofAttr.includes('ref'))) {
          try {
            const data = JSON.parse(dataMwAttr)

            // Standard Parsoid extension format
            if (data.name === 'ref') {
              const name = data.attrs?.name
              let content = data.body?.extsrc
              
              // If content is not in JSON, look for it in the document using the provided ID
              if (!content && data.body?.id) {
                const actualRefEl = doc.getElementById(data.body.id)
                if (actualRefEl) {
                  // Clean up the reference content: remove backlinks, links, and styles
                  let html = actualRefEl.innerHTML
                  html = html.replace(/<span class="mw-cite-backlink">.*?<\/span>/g, '')
                  html = html.replace(/<(link|style)[^>]*>.*?<\/\1>/gi, '')
                  html = html.replace(/<(link|style)[^>]*>/gi, '')
                  content = html.trim()
                }
              }

              if (content) {
                if (name) collectedRefs[`name:${name}`] = content
                const refId = el.getAttribute('id')
                if (refId) collectedRefs[refId] = content
              }
            } 
            // Composite template format
            else if (data.parts) {
              data.parts.forEach((part: any) => {
                const ext = part.extension
                if (ext && ext.name === 'ref') {
                  const name = ext.attrs?.name
                  let content = ext.body?.extsrc

                  if (!content && ext.body?.id) {
                    const actualRefEl = doc.getElementById(ext.body.id)
                    if (actualRefEl) {
                      let html = actualRefEl.innerHTML
                      html = html.replace(/<span class="mw-cite-backlink">.*?<\/span>/g, '')
                      html = html.replace(/<(link|style)[^>]*>.*?<\/\1>/gi, '')
                      html = html.replace(/<(link|style)[^>]*>/gi, '')
                      content = html.trim()
                    }
                  }

                  if (content) {
                    if (name) collectedRefs[`name:${name}`] = content
                    const refId = el.getAttribute('id')
                    if (refId) collectedRefs[refId] = content
                  }
                }
              });
            }
          } catch (e) {}
        }
      })
      
      referenceMap.value = collectedRefs

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
      const fullHtml = blocks.value
        .filter(b => {
          // Include blocks translated by the user
          if (translatedContent[b.id]) return true
          
          // Include the reference definitions block (essential for resolving <ref> tags)
          return (
            b.html.includes('mw-ref-content') || 
            b.html.includes('mw-references-wrap') || 
            b.html.includes('mw:Extension/references')
          )
        })
        .map(b => {
          const translation = translatedContent[b.id]
          if (translation) {
            // For translated blocks, wrap them back in their original tags
            if (['STYLE', 'LINK', 'META', 'NOSCRIPT'].includes(b.tagName)) return translation
            const tag = b.tagName.toLowerCase()
            return `<${tag}>${translation}</${tag}>`
          }
          // For the untranslated essential blocks (like reference data), use original HTML
          return b.html
        })
        .join('')

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
    title, activeTitle, activeArticleId, isFetching, isBlocksLoading, blocks, savedArticles, bodyClass, articleStyles,
    isSerializing, generatedWikitext, isCopied,
    fetchArticle, loadArticleFromList, clearArticle, removeArticle, generateWikitext, copyToClipboard,
    updateSavedArticlesList
  }
}
