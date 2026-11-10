# Tasks

### Phase 1: Infrastructure & API
- [x] Configure `runtimeConfig` to securely handle `GEMINI_API_KEY`.
- [x] Create a central constant for the LLM translation prompt.
- [x] Implement a basic POST API endpoint (`server/api/translate.post.ts`) that returns a dummy response.
- [x] Integrate Google Generative AI SDK (or $fetch to Gemini API) into the endpoint.
- [x] Verify translation results using the specialized academic prompt.

### Phase 2: Frontend Layout
- [x] Set up a dual-pane layout using Tailwind CSS.
- [x] Create an input field to fetch Wikipedia articles by title.
- [x] Display raw Parsoid HTML in the left pane.

### Phase 3: Translation Logic & UI
- [x] Add click event listeners to paragraphs in the left pane.
- [x] Implement loading states for paragraph translation.
- [x] Display translated text in the right pane.

### Phase 4: Wikipedia-specific Enhancements (XML Vault & Triple Magic)
- [x] Implement a general placeholder system (`<wp_element_n />`) to protect all `typeof` elements (templates, refs, math, etc.).
- [x] Create a server-side API (`server/api/wiki/langlink.get.ts`) to check for Japanese article counterparts.
- [x] Introduce XML-like link tags (`<wp_link title="..." ja="...">`) to prevent LLM from stripping links.
- [x] Implement the dynamic "Triple Magic" link conversion (API check + `[[...]]` or `{{ill}}` formatting).
- [x] Restore protected elements from the vault and finalize the Wikitext output.
- [x] Add a "Copy to Clipboard" button for the generated Wikitext.

### Phase 5: Pure HTML Parallel Editor & Round-trip
- [x] Refactor article storage to a block-based system (Parallel Rows).
- [x] Implement side-by-side aligned layout for English and Japanese segments.
- [x] Migrate "Vault" to be per-block to support multiple persistent translations.
- [x] Refine `finalizeTranslation` to output pure Parsoid-compatible HTML (no raw Wikitext).
    - [x] Internal links as `<a>` tags with updated `href` and `title`.
    - [x] `{{ill}}` as `mw:Transclusion` HTML elements.
- [x] Improve UI layout for fetch loading and ensure heading tags are preserved in translations.
- [x] Create `server/api/wiki/serialize.post.ts` to convert integrated HTML back to Wikitext.
- [x] Implement a feature to reconstruct the full article HTML and convert it to Wikitext.

### Phase 6: Persistence & Multi-article Support
- [x] Set up IndexedDB storage using `unstorage` with base 'wikipedia-translation-helper'.
- [x] Implement `usePersistentState` composable with auto-save debounce.
- [x] Implement `articleId` generation in `useWikipediaArticle`.
- [x] Migrate `blocks` and `title` to persistent state in `useWikipediaArticle`.
- [x] Migrate `translatedContent` to persistent state in `useTranslation`.
- [x] Add ArticleSelector UI to manage saved articles.
- [x] Fix race condition between persistent state loading and article fetching.

### Phase 7: Manual Editing & Progress Tracking
- [x] Implement `progress` calculation in `useTranslation`.
- [x] Add a 0.5rem blue progress bar below the header in `app.vue`.
- [x] Implement click-to-edit functionality for translated blocks in `TranslationRow.vue`.
- [x] Ensure `textarea` styling matches original text and handles blur/Esc.
- [x] Fix Wikipedia style persistence by rendering STYLE tags and handling absolute URLs.

### Phase 8: Project Identity
- [x] Update GitHub description and README to reflect tool focus and LLM performance improvements.

### Phase 9: Routing & UX Improvements
- [x] Set up Nuxt routing with `pages/` directory.
- [x] Implement URL-based article loading (e.g., `/[title]`).
- [x] Refactor `app.vue` into a layout-like structure with `NuxtPage`.
- [x] Update `useWikipediaArticle` to sync state with route params.
- [x] Fix generated Wikitext to only include translated content and preserve HTML structure.
- [ ] Intermittent "NetworkError / No Response" during long translation tasks (Firefox/General).

### Phase 10: UX Enhancements
- [x] Implement Wikipedia article suggestion in the search input.

### Phase 11: Deployment (Cloud Run to Cloudflare Workers)
- [x] Switch Nitro preset to `cloudflare_module` and bump `compatibilityDate` to `2026-11-10`.
- [x] Prerender the SPA shell (`index.html`) while keeping the server bundle for `/api/*`.
- [x] Configure Workers Static Assets so only `/api/*` invokes the Worker (`run_worker_first` + `not_found_handling: single-page-application`).
- [x] Add `wrangler`/`miniflare` dev deps and `deploy`/`preview` scripts.
- [x] Replace the Cloud Run GitHub Actions workflow with a Workers deploy.
- [x] Pin the Worker name to `wikipedia-translation-helper`.
- [x] Remove Cloud Run artifacts (`Dockerfile`, `.dockerignore`).
- [x] Document Cloudflare deploy and local preview in the README.
- [ ] Set `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` repo secrets and create the Worker secrets.

