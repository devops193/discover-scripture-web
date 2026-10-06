# DISCOVER-GTM-PILOT-01B Performance Validation

Status: **PASS for human review**  
Validated: 2026-10-05 against the local optimized production build.

## Build and payload

- Native `vinext build`: PASS.
- Existing Netlify path, `next build`: PASS with all marketing pages statically prerendered.
- Client CSS: 38.79 KB raw / 8.61 KB gzip.
- Shared client JavaScript reported by the native build: approximately 116 KB gzip across framework/runtime/route chunks.
- Marketing JPEGs range from 32 KB to 320 KB; all nine inspected public product images are at or below 320 KB.
- The homepage uses no external web-font payload.

## Browser measurement

On a local cold phone-sized browser context:

```text
DOMContentLoaded=13ms
load=51ms
initialResourceCount=22
initialTransferBytes=925200
initialIframes=0
consoleErrors=0
```

The values are local-build measurements, not claims about production network latency. The important architectural result is that the live Scripture application iframe is absent from the initial resource window. It remains embedded lower on the homepage and loads lazily when the reader approaches it. Non-hero product visuals also use native lazy loading.

## Cache and transition behavior

Static marketing assets retain the existing Next.js/Netlify delivery path and filenames are build-hashed where applicable. The live application route remains `/product-app/`; no duplicate runtime or alternate deployment path was introduced.
