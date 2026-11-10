interface WikipediaPage {
  title?: string
  missing?: string
  langlinks?: Array<{
    lang: string
    '*': string
  }>
}

interface WikipediaLanglinksResponse {
  query?: {
    pages?: Record<string, WikipediaPage>
    normalized?: Array<{ from: string; to: string }>
  }
}

// MediaWiki allows up to 50 titles per query for anonymous clients.
const MAX_TITLES_PER_REQUEST = 50

function normalizeTitle(title: string) {
  return title.replace(/_/g, ' ').trim()
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function resolveLanglinks(
  titles: string[],
  from: 'en' | 'ja',
  userAgent: string
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {}
  const pending: string[] = []

  for (const title of titles) {
    const cached = getCachedValue<string | null>(`langlink:${from}:${title}`)
    if (cached === undefined) {
      pending.push(title)
    } else {
      results[title] = cached
    }
  }

  const domain = from === 'ja' ? 'ja.wikipedia.org' : 'en.wikipedia.org'
  const targetLang = from === 'ja' ? 'en' : 'ja'

  for (const group of chunk(pending, MAX_TITLES_PER_REQUEST)) {
    const response = await throttledWikiFetch<WikipediaLanglinksResponse>(`https://${domain}/w/api.php`, {
      params: {
        action: 'query',
        titles: group.join('|'),
        prop: 'langlinks',
        lllang: targetLang,
        format: 'json',
        origin: '*',
      },
      headers: {
        'User-Agent': userAgent,
      },
    })

    const normalized = new Map(
      (response.query?.normalized ?? []).map(entry => [normalizeTitle(entry.from), normalizeTitle(entry.to)])
    )
    const pagesByTitle = new Map<string, WikipediaPage>()
    for (const page of Object.values(response.query?.pages ?? {})) {
      if (page.title) pagesByTitle.set(normalizeTitle(page.title), page)
    }

    for (const title of group) {
      const key = normalized.get(normalizeTitle(title)) ?? normalizeTitle(title)
      const targetTitle = pagesByTitle.get(key)?.langlinks?.[0]?.['*'] ?? null
      results[title] = targetTitle
      setCachedValue(`langlink:${from}:${title}`, targetTitle)
    }
  }

  return results
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const titlesParam = query.titles as string | undefined
  const singleTitle = query.title as string | undefined
  const from = query.from === 'ja' ? 'ja' : 'en'

  const titles = titlesParam
    ? titlesParam.split('|').filter(Boolean)
    : singleTitle
      ? [singleTitle]
      : []

  if (titles.length === 0) {
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

  const results = await resolveLanglinks(titles, from, config.wikipediaUserAgent)

  // Backwards-compatible single-title response.
  if (!titlesParam) {
    return {
      title: titles[0],
      targetTitle: results[titles[0]!] ?? null,
    }
  }

  return { results }
})
