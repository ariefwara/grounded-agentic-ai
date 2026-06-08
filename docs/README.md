# Documentation Site

Astro documentation site for the Markdown files in this folder.

Development:

```bash
npm run dev
```

Build and host with Node.js:

```bash
npm run build
npm start
```

Open:

```text
http://localhost:4321
```

Production build:

```bash
npm run build
```

The Firebase-hosted site is available at:

```text
https://agentic-ai-e6e15.web.app
```

Regenerate all public feature pages with DeepSeek:

```bash
npm run generate:features
```

Generate one feature:

```bash
npm run generate:features -- --target guided-conversations
```

The shared narrative prompt and one outline per feature are maintained in `../scripts/documentation/`.
