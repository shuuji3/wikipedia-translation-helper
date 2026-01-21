# 🌐 Wikipedia Translation Helper

A tool designed to assist with translating Wikipedia articles. It leverages the MediaWiki Parsoid API to maintain article structure while providing LLM-assisted translation and automated interlanguage link ({{ill}}) conversion.

## Key Features

- **Parallel Block-based Editor**: Splits articles into segments (paragraphs, headings, etc.) for side-by-side viewing and editing of original and translated text.
- **Automated Link Conversion**:
  - Verifies the existence of linked articles on the target language Wikipedia via API.
  - Automatically converts links to standard internal links if they exist, or to the `{{ill}}` template format if they do not.
- **Element Protection**: Protects Wikipedia-specific elements such as templates, references, and mathematical formulas during translation to prevent structural corruption.
- **Wikitext Export**: Reconstructs edited content and exports it as Wikitext via the Parsoid API for easy copying and usage.

## Setup

### Installation

```bash
pnpm install
```

### Configuration

Copy `.env.example` to `.env` and configure the environment variables (Gemini API Key and User-Agent).

```bash
cp .env.example .env
```

```env
# Google Gemini API Key
NUXT_GEMINI_API_KEY=your_api_key_here

# Wikipedia API User-Agent (Required)
NUXT_WIKIPEDIA_USER_AGENT=WikipediaTranslationHelper/1.0 (contact@example.com)
```

## Development and Usage

### Development Mode

```bash
pnpm dev
```

### Build and Preview

```bash
pnpm build
pnpm preview
```

## Project Structure

- `/app`: Frontend implementation (Nuxt 4)
- `/server`: API endpoints for translation, parsing, and serialization
- `/archive`: Legacy implementation of the tool (for reference)

## License

MIT
