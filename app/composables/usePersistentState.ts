import { storage } from '../utils/storage'

/**
 * Global registry to ensure each persistent state only sets up its watchers once.
 */
const initializedStates = new Set<string>()

/**
 * A simple utility to sync a Ref with IndexedDB.
 */
export function usePersistentState<T>(state: Ref<T>, keyGetter: () => string | null, defaultValue: T, deep: boolean = false) {
  if (import.meta.server) return { isInitialLoading: ref(false) }

  const isInitialLoading = ref(false)
  const stateName = (state as any)._name || 'unknown'

  if (!initializedStates.has(stateName + (keyGetter.toString().length))) {
    initializedStates.add(stateName + (keyGetter.toString().length))

    // 1. Watch for key changes to LOAD data
    watch(keyGetter, async (newKey) => {
      if (!newKey) {
        state.value = JSON.parse(JSON.stringify(defaultValue))
        return
      }
      
      isInitialLoading.value = true
      try {
        const saved = await storage.getItem<T>(newKey)
        if (saved !== null) {
          state.value = saved
        } else {
          state.value = JSON.parse(JSON.stringify(defaultValue))
        }
      } catch (e) {
        console.error(`[Persistence] Failed to load key: ${newKey}`, e)
      } finally {
        setTimeout(() => {
          isInitialLoading.value = false
        }, 100)
      }
    }, { immediate: true })

    // 2. Watch for state changes to SAVE data
    let timeout: any = null
    watch(state, (newValue) => {
      if (isInitialLoading.value) return
      
      const key = keyGetter()
      if (!key) return

      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(async () => {
        if (isInitialLoading.value) return
        try {
          await storage.setItem(key, newValue)
        } catch (e) {
          console.error(`[Persistence] Failed to save key: ${key}`, e)
        }
      }, 1000)
    }, { deep })
  }

  return { isInitialLoading }
}
