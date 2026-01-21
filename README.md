# Wikipedia Translation Helper

🌐 Wikipedia Translation Helper: reduce manual interwikilink conversion during localization

## Overview
This tool assists in translating Wikipedia articles by leveraging LLM (Gemini API) and the Parsoid API. It features paragraph-by-paragraph translation and automated interwiki link (`{{ill}}`) conversion.

## Setup

Make sure to install dependencies:

```bash
pnpm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

## Tasks
- [ ] Implement UI for article title input and dual-pane layout.
- [ ] Display Wikipedia article content (English) in the left pane.
- [ ] Create a translation API endpoint using Gemini with the specialized prompt.
- [ ] Implement click-to-translate functionality for each paragraph.
- [ ] Integrate LLM-based link checking logic to convert links to `{{ill}}` or internal links.
- [ ] Add a "Copy to Clipboard" button for the final Wikitext.
