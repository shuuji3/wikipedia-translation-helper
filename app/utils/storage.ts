import { createStorage } from 'unstorage'
import indexedDbDriver from 'unstorage/drivers/indexedb'

/**
 * Central storage instance for the application.
 * Uses IndexedDB to persist data locally in the browser.
 * The base name is set to 'wikipedia-translation-helper' to avoid collisions.
 */
export const storage = createStorage({
  driver: indexedDbDriver({
    base: 'wikipedia-translation-helper'
  })
})
