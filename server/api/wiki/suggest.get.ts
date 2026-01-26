export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = query.q as string

  if (!search) {
    return []
  }

  const config = useRuntimeConfig(event)

  // Wikipedia OpenSearch API
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=${encodeURIComponent(search)}&limit=10`

  try {
    const response = await $fetch<[string, string[], string[], string[]]>(url, {
      headers: {
        'User-Agent': config.wikipediaUserAgent || 'WikipediaTranslationHelper/1.0'
      }
    })
    
    // response[1] contains the array of matched titles
    return response[1] || []
  } catch (error: any) {
    console.error('Failed to fetch suggestions from Wikipedia:', error)
    return []
  }
})
