# 🌐 Wikipedia Translation Helper

The **Wikipedia Translation Helper** is a specialized tool designed to optimize the Wikipedia article translation process. By leveraging Large Language Models (Gemini API) and the official Wikipedia Parsoid API, it automates tedious tasks like interwiki link conversion (`{{ill}}`) while preserving the complex structure of Wikipedia articles.

## ✨ Key Features

- **Parallel Block-based Editor**: Articles are split into logical segments (paragraphs, headings, lists). Translate English and Japanese side-by-side with perfect alignment.
- **"Triple Magic" Link Conversion**: 
  - Automatically checks if a linked English article has a Japanese counterpart via the Wikipedia API.
  - If a Japanese article exists, it creates a standard `[[...]]` link.
  - If not, it automatically formats an `{{ill}}` (Interlanguage link) template to ensure no information is lost.
- **Vault Protection System**: Sophisticated placeholder system protects Wikipedia-specific elements (Templates, References, Math, etc.) during LLM translation, ensuring the technical structure remains intact.
- **Pure HTML Round-trip**: Fetches clean Parsoid HTML and reconstructs it back into valid Wikitext using the official serialization API.
- **Smart Link Handling**: Intelligent extraction and restoration of internal links to maintain semantic integrity.

## 🛠️ Tech Stack

- **Framework**: Nuxt 4 (Modern Full-stack Vue)
- **Styling**: Tailwind CSS
- **AI**: Google Gemini API (gemini-3-flash-preview)
- **API**: Wikipedia REST API (Parsoid)

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS)
- pnpm

### Installation

```bash
pnpm install
```

### Configuration

Create a `.env` file in the root directory and add your credentials:

```env
# Google Gemini API Key
NUXT_GEMINI_API_KEY=your_api_key_here

# Wikipedia API User-Agent (Required)
NUXT_WIKIPEDIA_USER_AGENT=WikipediaTranslationHelper/1.0 (contact@example.com)
```

### Development

Start the development server:

```bash
pnpm dev
```

Visit `http://localhost:3000` to start translating.

### Production Build

```bash
pnpm build
pnpm preview
```

## 📂 Project Structure

- `/app`: Frontend implementation (Nuxt 4)
- `/server`: API endpoints for translation, parsing, and serialization
- `/archive`: Legacy implementation of the tool (for reference)

## 📄 License

MIT
