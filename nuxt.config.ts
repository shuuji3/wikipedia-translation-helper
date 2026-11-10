// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-11-10',
  future: {
    compatibilityVersion: 4,
  },
  nitro: {
    preset: 'cloudflare_module',
    // Emit a static SPA shell (index.html) while keeping the server bundle for /api routes.
    prerender: { routes: ['/'] },
    cloudflare: {
      // Generate .output/server/wrangler.json during build.
      deployConfig: true,
      wrangler: {
        name: 'wikipedia-translation-helper',
        assets: {
          // Serve the prerendered shell for unmatched requests, and only run the
          // Worker for API routes.
          not_found_handling: 'single-page-application',
          run_worker_first: ['/api/*'],
        },
      },
    },
  },
  modules: ['@nuxtjs/tailwindcss'],
  devtools: { enabled: true },
  runtimeConfig: {
    geminiApiKey: '',
    wikipediaUserAgent: '',
  }
})
