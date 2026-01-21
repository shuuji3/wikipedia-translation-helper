export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { html, title } = body

  if (!html || !title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Both HTML and Title are required for serialization',
    })
  }

  // Parsoid API endpoint for HTML to Wikitext conversion
  const url = `https://en.wikipedia.org/api/rest_v1/transform/html/to/wikitext/${encodeURIComponent(title)}`

  const config = useRuntimeConfig(event)

  if (!config.wikipediaUserAgent) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_WIKIPEDIA_USER_AGENT is not configured',
    })
  }

  try {
    const response = await $fetch<string>(url, {
      method: 'POST',
      headers: {
        'User-Agent': config.wikipediaUserAgent,
        // The API expects multipart/form-data or application/json for the body
        // When sending 'html', it's usually part of a JSON body for this specific endpoint
      },
      body: { html }
    })

    return {
      wikitext: response
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.message || 'Failed to serialize HTML to Wikitext',
    })
  }
})
