export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const title = query.title as string

  if (!title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required',
    })
  }

  // Wikipedia Parsoid API URL
  const url = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`

  const config = useRuntimeConfig(event)

  if (!config.wikipediaUserAgent) {
    throw createError({
      statusCode: 500,
      statusMessage: 'WIKIPEDIA_USER_AGENT is not configured',
    })
  }

  try {
    const response = await $fetch<string>(url, {
      headers: {
        'User-Agent': config.wikipediaUserAgent,
      },
    })

    return {
      title,
      html: response,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.message || 'Failed to fetch article from Wikipedia',
    })
  }
})
