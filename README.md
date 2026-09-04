# Discover Scripture

Public website for Discover Scripture — a calm, offline-first instrument for following people, entering events, and tracing ideas across the biblical text.

Scripture is the content. Discovery is the product.

This repository is the product site (home, about, privacy, terms, and support). It is not the native iOS/Android application.

## Local preview

Requires Node.js 22.13 or later.

```bash
npm install
npm run build
npm run start
```

Then open [http://localhost:3000](http://localhost:3000).

For a development server with live reload:

```bash
npm run dev
```

## Routes

| Path | Page |
| --- | --- |
| `/` | Home |
| `/about` | About |
| `/privacy` | Privacy Policy |
| `/terms` | Terms & Conditions |
| `/support` | Support |
| `/api/health` | Health check |

Public publication remains gated until release configuration is approved.
