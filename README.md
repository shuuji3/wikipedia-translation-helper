# 🌐 Wikipedia Translation Helper

The Wikipedia Translation Helper reduces manual interwikilink conversion during localization. It can convert a wikilink to another language Wikipedia link or an interlanguagelink template. For example, `[[something]]` wikilink in English article can be converted to `[[なにか]]` wikilink in Japanese article or `{{ill||なにか|en|something}}`.

We already have the [Wikipedia:Content translation tool - Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Content_translation_tool) which can do similar convesion. But we cannot exploit the same conversion to an existing translated article.

## Development

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
