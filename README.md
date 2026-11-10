# Wikipedia Translation Helper

A dedicated editor designed to streamline Wikipedia article translation. It automates missing link conversion and utilizes recent improvements in LLM translation performance while maintaining article structure via the MediaWiki Parsoid API.

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

`pnpm preview` serves the built Worker locally through Wrangler (`wrangler dev`).

## Deployment

Deploys to Cloudflare Workers. The frontend bundles and the prerendered SPA shell are served as static assets, so only `/api/*` routes invoke the Worker.

### Local preview secrets

Create a `.dev.vars` file (gitignored) mirroring `.env`:

```ini
NUXT_GEMINI_API_KEY=your_api_key_here
NUXT_WIKIPEDIA_USER_AGENT=WikipediaTranslationHelper/1.0 (contact@example.com)
```

### Production secrets

```bash
pnpm exec wrangler secret put NUXT_GEMINI_API_KEY
pnpm exec wrangler secret put NUXT_WIKIPEDIA_USER_AGENT
```

### Deploy

```bash
pnpm build
pnpm deploy
```

### CI/CD

`.github/workflows/deploy.yml` builds and deploys on push to `main` via `cloudflare/wrangler-action`. Required repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NUXT_GEMINI_API_KEY`
- `NUXT_WIKIPEDIA_USER_AGENT`

## Project Structure

- `/app`: Frontend implementation (Nuxt 4)
- `/server`: API endpoints for translation, parsing, and serialization
- `/archive`: Legacy implementation of the tool (for reference)

## License

MIT
