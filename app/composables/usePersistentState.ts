import { storage } from '../utils/storage'

/**
 * A composable for managing persistent state.
 * @param keyGetter A function that returns a unique key for the current article (e.g., () => articleId.value ? `${articleId.value}:blocks` : null)
 * @param defaultValue Initial value if no saved data is found.
 */
export function usePersistentState<T>(keyGetter: () => string | null, defaultValue: T) {
  const state = useState<T>(`persistent-${keyGetter() || 'init'}`, () => defaultValue)
  const isLoading = ref(false)
  let saveTimeout: NodeJS.Timeout | null = null

  // Load data when the key changes
  watch(keyGetter, async (newKey) => {
    if (!newKey || import.meta.server) return

    isLoading.value = true
    try {
      const saved = await storage.getItem<T>(newKey)
      if (saved !== null) {
        state.value = saved
      } else {
        state.value = defaultValue
      }
    } catch (e) {
      console.error(`Failed to load persistent state for key: ${newKey}`, e)
    } finally {
      isLoading.value = false
    }
  }, { immediate: true })

  // Auto-save with debounce when the state changes
  watch(state, (newValue) => {
    const key = keyGetter()
    if (!key || import.meta.server || isLoading.value) return

    if (saveTimeout) clearTimeout(saveTimeout)
    
    saveTimeout = setTimeout(async () => {
      try {
        await storage.setItem(key, newValue)
      } catch (e) {
        console.error(`Failed to save persistent state for key: ${key}`, e)
      }
    }, 500) // 500ms debounce
  }, { deep: true })

  return state
}
