// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  modules: ['@nuxtjs/tailwindcss'],
  devtools: { enabled: true },
  runtimeConfig: {
    geminiApiKey: '', // Overridden by NUXT_GEMINI_API_KEY
    wikipediaUserAgent: '', // Overridden by NUXT_WIKIPEDIA_USER_AGENT
  }
})
