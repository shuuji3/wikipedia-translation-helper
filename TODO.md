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

### Phase 4: Wikipedia-specific Enhancements (The Vault & Triple Magic)
- [ ] Implement a general placeholder system (`<wp_element_n />`) to protect all `typeof` elements (templates, refs, math, etc.).
- [ ] Create a server-side API (`server/api/wiki/langlink.get.ts`) to check for Japanese article counterparts.
- [ ] Implement the "Triple Magic" link conversion (API check + `[[...]]` or `{{ill}}` formatting).
- [ ] Integrate link conversion and placeholder restoration into the translation flow.
- [ ] Add a "Copy to Clipboard" button for the generated Wikitext.

### Phase 5: Editor Improvements & Refinement
- [ ] Maintain a list of all translated paragraphs in the right pane.
- [ ] Make translated blocks editable for manual correction.
- [ ] Implement a feature to copy the entire translated article as Wikitext.
