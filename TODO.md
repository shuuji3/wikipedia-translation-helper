# Tasks

### Phase 1: Infrastructure & API
- [x] Configure `runtimeConfig` to securely handle `GEMINI_API_KEY`.
- [x] Create a central constant for the LLM translation prompt.
- [ ] Implement a basic POST API endpoint (`server/api/translate.post.ts`) that returns a dummy response.
- [ ] Integrate Google Generative AI SDK (or $fetch to Gemini API) into the endpoint.
- [ ] Verify translation results using the specialized academic prompt.

### Phase 2: Frontend Layout
- [ ] Set up a dual-pane layout using Tailwind CSS.
- [ ] Create an input field to fetch Wikipedia articles by title.
- [ ] Display raw Parsoid HTML in the left pane.

### Phase 3: Translation Logic & UI
- [ ] Add click event listeners to paragraphs in the left pane.
- [ ] Implement loading states for paragraph translation.
- [ ] Display translated text in the right pane.

### Phase 4: Wikipedia-specific Enhancements
- [ ] Implement LLM-based link analysis to identify Wikipedia articles.
- [ ] Integrate API calls to check for Japanese Wikipedia counterparts.
- [ ] Automatically convert links to `{{ill}}` or internal links.
- [ ] Add a "Copy to Clipboard" button for the generated Wikitext.
