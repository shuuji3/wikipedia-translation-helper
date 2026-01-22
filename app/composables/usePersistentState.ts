import { storage } from '../utils/storage'

// Global registry to ensure each persistent state only sets up its watchers once
const initializedStates = new Set<string>()

/**
 * A utility to manage persistent state with a stable key.
 * Ensures that only one set of watchers exists for each stateName.
 */
export function usePersistentState<T>(stateName: string, keyGetter: () => string | null, defaultValue: T) {
  const state = useState<T>(stateName, () => defaultValue)
  
  // We only set up watchers once per unique stateName
  if (import.meta.client && !initializedStates.has(stateName)) {
    initializedStates.add(stateName)

    const isSyncing = ref(false)
    let lastLoadedKey: string | null = null
    let saveTimeout: any = null

    // Watch for key changes to load data from storage
    watch(keyGetter, async (newKey) => {
      if (newKey === lastLoadedKey) return
      
      if (!newKey) {
        lastLoadedKey = null
        state.value = defaultValue
        return
      }

      isSyncing.value = true
      try {
        const saved = await storage.getItem<T>(newKey)
        lastLoadedKey = newKey
        
        // Only apply if we actually found something
        if (saved !== null) {
          state.value = saved
        } else {
          state.value = defaultValue
        }
      } catch (e) {
        console.error(`[usePersistentState:${stateName}] Load failed for ${newKey}:`, e)
      } finally {
        // Wait a bit before allowing saves to prevent immediate overwrite
        setTimeout(() => {
          isSyncing.value = false
        }, 100)
      }
    }, { immediate: true })

    // Watch for state changes to save data to storage
    watch(state, (newValue) => {
      const key = keyGetter()
      if (!key || isSyncing.value) return

      if (saveTimeout) clearTimeout(saveTimeout)
      saveTimeout = setTimeout(async () => {
        try {
          // Double check syncing flag inside timeout
          if (isSyncing.value) return
          await storage.setItem(key, newValue)
        } catch (e) {
          console.error(`[usePersistentState:${stateName}] Save failed for ${key}:`, e)
        }
      }, 500)
    }, { deep: true })
  }

  return state
}
