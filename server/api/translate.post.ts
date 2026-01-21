export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)
  const text = body.text

  if (!text) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Text is required for translation',
    })
  }

  const apiKey = config.geminiApiKey
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gemini API key is not configured',
    })
  }

  // Combine system prompt with the input text
  const fullPrompt = `${ACADEMIC_TRANSLATION_PROMPT}\n\nInput: '${text}'\nOutput:`

  // Gemini API endpoint (using the latest gemini-3-flash-preview)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`

  try {
    const response = await $fetch<any>(endpoint, {
      method: 'POST',
      body: {
        contents: [
          {
            parts: [{ text: fullPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1, // Ensure consistent academic output
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
