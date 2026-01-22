import type { TranslationBlock } from './useWikipediaArticle'

// Global state for translation to be shared across components
export function useTranslation() {
  const config = useRuntimeConfig()
  const { title } = useWikipediaArticle()

  const articleId = computed(() => {
    if (!title.value) return null
    return title.value.trim().replace(/\s+/g, '_')
  })

  const translatingId = useState<string | null>('translatingId', () => null)
  const selectedId = useState<string | null>('selectedId', () => null)
  const selectedTextSnippet = useState<string>('selectedTextSnippet', () => '')
  const translatedContent = usePersistentState<Record<string, string>>(
    () => articleId.value ? `${articleId.value}:translations` : null,
    {}
  )

  async function translateBlock(block: TranslationBlock) {
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

    const textWithPlaceholders = prepareTranslationText(el, block.vault)
    const plainText = el.textContent?.trim() || ''
    selectedTextSnippet.value = plainText.substring(0, 60) + (plainText.length > 60 ? '...' : '')

    if (translatedContent.value[id]) return
    if (translatingId.value === id) return

    translatingId.value = id
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const apiPath = `${origin}${config.app.baseURL}api/translate`
      const response = await $fetch<{ original: string; translated: string }>(apiPath, {
        method: 'POST',
        body: { text: textWithPlaceholders }
      })

      const finalized = await finalizeTranslation(response.translated, block.vault, config)
      translatedContent.value[id] = finalized
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
    translatingId,
    selectedId,
    selectedTextSnippet,
    translatedContent,
    translateBlock,
    resetTranslation
  }
}
