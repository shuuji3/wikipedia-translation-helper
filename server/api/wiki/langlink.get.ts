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
  const from = (query.from as string) || 'en'

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

  // Determine source domain and target language
  const domain = from === 'ja' ? 'ja.wikipedia.org' : 'en.wikipedia.org'
  const targetLang = from === 'ja' ? 'en' : 'ja'

  const url = `https://${domain}/w/api.php`
  const params = {
    action: 'query',
    titles: title,
    prop: 'langlinks',
    lllang: targetLang,
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
    if (!pages) return { title, targetTitle: null }

    const pageIds = Object.keys(pages)
    if (pageIds.length === 0 || pageIds[0] === '-1') {
      return { title, targetTitle: null }
    }

    const pageId = pageIds[0]
    // @ts-ignore
    const langlinks = pages[pageId].langlinks

    const targetTitle: string | null = langlinks?.[0]?.['*'] || null

    return {
      title,
      targetTitle,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.data?.error?.message || error.message || 'Failed to fetch language links from Wikipedia',
    })
  }
})
