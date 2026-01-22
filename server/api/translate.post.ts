export default defineEventHandler(async (event) => {
  // Set standard headers to keep connection alive when translation takes time
  setHeaders(event, {
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=300'
  })

  const config = useRuntimeConfig(event)
  const apiKey = config.geminiApiKey
  const body = await readBody(event)
  const text = body.text

  if (!text) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Text is required for translation',
    })
  }

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gemini API key is not configured (Expected NUXT_GEMINI_API_KEY)',
    })
  }

  // Gemini API endpoint (using the latest gemini-3-flash-preview)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`

  try {
    const response = await $fetch<any>(endpoint, {
      method: 'POST',
      body: {
        system_instruction: {
          parts: [{ text: ACADEMIC_TRANSLATION_PROMPT }]
        },
        contents: [
          {
            parts: [{ text: text }]
          }
        ],
        generationConfig: {
          temperature: 0.1, // Ensure consistent academic output
          thinking_config: {
            include_thoughts: false,
          },
        }
      }
    })

    const translatedText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!translatedText) {
      throw new Error('Empty response from Gemini API')
    }

    return {
      original: text,
      translated: translatedText,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.data?.error?.message || error.message || 'Failed to call Gemini API',
    })
  }
})
