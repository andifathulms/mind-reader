import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { DEFAULT_ORIGIN, ROUTES } from './src/meta';
import react from '@vitejs/plugin-react';

const BASE = process.env.BASE_PATH ?? '/mind-reader/';
const ORIGIN = (process.env.SITE_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/$/, '');

const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The machine's ground, read out of the design tokens rather than restated.
 *
 * index.html carried theme-color="#14171A" from before tokens.css existed, and
 * had been wrong ever since the palette was set. A colour written down twice
 * gets out of step; this one now has a single definition and the build goes and
 * reads it.
 */
function themeColour(): string {
  const tokens = readFileSync(new URL('./src/styles/tokens.css', import.meta.url), 'utf8');
  const match = /--machine:\s*(#[0-9a-fA-F]{3,8})\s*;/.exec(tokens);
  if (!match?.[1]) throw new Error('tokens.css no longer defines --machine; metadata cannot build');
  return match[1];
}

/**
 * Every head tag that describes a route, generated from src/meta.ts.
 *
 * Written as a plugin rather than into the two HTML files because a description
 * maintained by hand drifts away from the page it describes, and because the
 * font filename is content hashed and only exists once the bundle does.
 */
function metadata(): Plugin {
  const theme = themeColour();
  return {
    name: 'mind-reader-metadata',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const file = ctx.path.replace(/^\//, '') || 'index.html';
        const route = ROUTES.find((r) => r.file === file);
        if (!route) return html;

        const url = `${ORIGIN}${BASE}${route.path}`;

        /*
         * Preload the interface face, and only that one. It is referenced from
         * CSS, so without this the browser cannot begin fetching it until the
         * stylesheet has arrived and parsed: a whole round trip of the first
         * text being invisible. Courier Prime is deliberately not preloaded.
         * It appears in the archive and in citations, none of it above the
         * fold, and pulling 18.6 kB forward to race the sans would make the
         * thing people actually read arrive later.
         */
        const sans = Object.keys(ctx.bundle ?? {}).find((name) =>
          /public-sans.*\.woff2$/.test(name),
        );
        const preload = sans
          ? `<link rel="preload" href="${BASE}${sans}" as="font" type="font/woff2" crossorigin />`
          : '';

        const tags = [
          preload,
          `<link rel="canonical" href="${escape(url)}" />`,
          `<meta name="theme-color" content="${theme}" />`,
          `<meta property="og:type" content="website" />`,
          `<meta property="og:site_name" content="Mind reader" />`,
          `<meta property="og:title" content="${escape(route.title)}" />`,
          `<meta property="og:description" content="${escape(route.description)}" />`,
          `<meta property="og:url" content="${escape(url)}" />`,
          `<meta name="twitter:card" content="summary" />`,
          `<meta name="twitter:title" content="${escape(route.title)}" />`,
          `<meta name="twitter:description" content="${escape(route.description)}" />`,
        ]
          .filter(Boolean)
          .join('\n    ');

        return html
          .replace(/<title>[^<]*<\/title>/, `<title>${escape(route.title)}</title>`)
          .replace(
            /<meta\s+name="description"[\s\S]*?\/>/,
            `<meta name="description" content="${escape(route.description)}" />`,
          )
          .replace(/\s*<meta name="theme-color"[^>]*\/>/, '')
          .replace('</head>', `  ${tags}\n  </head>`);
      },
    },
  };
}

/** robots.txt and a sitemap, so the two routes can be found and told apart. */
function discovery(): Plugin {
  return {
    name: 'mind-reader-discovery',
    generateBundle() {
      const urls = ROUTES.map(
        (route) =>
          `  <url>\n    <loc>${ORIGIN}${BASE}${route.path}</loc>\n    <priority>${route.priority}</priority>\n  </url>`,
      ).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}${BASE}sitemap.xml\n`,
      });
    },
  };
}

// GitHub Pages serves the project from /mind-reader/. Override with BASE_PATH
// when hosting elsewhere.
export default defineConfig({
  base: BASE,
  plugins: [react(), metadata(), discovery()],
  build: {
    target: 'es2022',
    // Two entries. The arena stays at the root because DESIGN.md 4.5 makes the
    // first experience playing rather than reading; the landing page is a
    // second door for people arriving from a link, and it shares the tokens,
    // the fonts and the engine with the app rather than restating them.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        landing: fileURLToPath(new URL('./landing.html', import.meta.url)),
      },
    },
    // Fonts ship as files in the bundle, never fetched from a CDN: PRD 7.5
    // forbids any network request at runtime.
    assetsInlineLimit: 0,
  },
});
