import type { TranslationBlock } from './useWikipediaArticle'

export function useTranslation() {
  const config = useRuntimeConfig()
  const { activeTitle, activeArticleId, updateSavedArticlesList, blocks } = useWikipediaArticle()

  const translatedContent = useState<Record<string, string>>('wiki-translated-content', () => ({}))
  const translatingId = useState<string | null>('translatingId', () => null)
  const selectedId = useState<string | null>('selectedId', () => null)
  const selectedTextSnippet = useState<string>('selectedTextSnippet', () => '')

  const progress = computed(() => {

    if (!blocks.value.length) return 0
    const translatedCount = Object.keys(translatedContent.value).length
    return Math.round((translatedCount / blocks.value.length) * 100)
  })

  // Setup Persistence for translations based on ACTIVE title
  usePersistentState(
    translatedContent, 
    () => activeArticleId.value ? `${activeArticleId.value}:translations` : null,
    {},
    true
  )

  async function translateBlock(block: TranslationBlock) {
    const id = block.id
    selectedId.value = id

    if (['STYLE', 'LINK', 'META', 'NOSCRIPT'].includes(block.tagName)) {
      translatedContent.value[id] = block.html
      updateSavedArticlesList()
      return
    }

    const el = document.getElementById(id)
    if (!el) return

    const textWithPlaceholders = prepareTranslationText(el, block.vault)
    const plainText = el.textContent?.trim() || ''
    selectedTextSnippet.value = plainText.substring(0, 60) + (plainText.length > 60 ? '...' : '')

    if (translatedContent.value[id] || translatingId.value === id) return

    translatingId.value = id
    try {
      const response = await $fetch<{ original: string; translated: string }>(`${window.location.origin}${config.app.baseURL}api/translate`, {
        method: 'POST',
        body: { text: textWithPlaceholders }
      })
      const finalized = await finalizeTranslation(response.translated, block.vault, config)
      translatedContent.value[id] = finalized
      updateSavedArticlesList()
    } catch (error) {
      console.error('Translation failed:', error)
    } finally {
      translatingId.value = null
    }
  }

  function resetTranslation() {
    translatedContent.value = {}
    selectedId.value = null
    selectedTextSnippet.value = ''
    translatingId.value = null
  }

  return {
    translatingId, selectedId, selectedTextSnippet, translatedContent,
    progress, translateBlock, resetTranslation
  }
}
