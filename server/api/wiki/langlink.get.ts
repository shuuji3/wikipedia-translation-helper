interface WikipediaLanglinksResponse {
  query?: {
    pages?: Record<string, {
      langlinks?: Array<{
        lang: string
        '*': string
      }>
    }>
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const title = query.title as string

  if (!title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required',
    })
  }

  const config = useRuntimeConfig(event)
  if (!config.wikipediaUserAgent) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_WIKIPEDIA_USER_AGENT is not configured',
    })
  }

  // Wikipedia API URL for fetching language links
  const url = 'https://en.wikipedia.org/w/api.php'
  const params = {
    action: 'query',
    titles: title,
    prop: 'langlinks',
    lllang: 'ja',
    format: 'json',
    origin: '*',
  }

  try {
    const response = await $fetch<WikipediaLanglinksResponse>(url, {
      params,
      headers: {
        'User-Agent': config.wikipediaUserAgent,
      },
    })

    const pages = response.query?.pages
    if (!pages) return { title, jaTitle: null }

    // Extract the first page from the result
    const pageIds = Object.keys(pages)
    if (pageIds.length === 0 || pageIds[0] === '-1') {
      return { title, jaTitle: null }
    }

    const pageId = pageIds[0]
    // @ts-ignore
    const langlinks = pages[pageId].langlinks

    // Return the Japanese title if it exists, otherwise null
    const jaTitle: string | null = langlinks?.[0]?.['*'] || null

    return {
      title,
      jaTitle,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.data?.error?.message || error.message || 'Failed to fetch language links from Wikipedia',
    })
  }
})
