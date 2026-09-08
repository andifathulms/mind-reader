/**
 * The one place a route's identity is written down.
 *
 * Titles and descriptions used to live as literals in two HTML files, hand
 * maintained and answerable to nothing. They had already drifted: index.html
 * carried a theme colour from before tokens.css existed. A description that has
 * come loose from the page it describes is worse than no description, so these
 * strings are the ones the pages actually render, exported from here and
 * imported by both the components and the build.
 *
 * The build reads this file through the plugin in vite.config.ts. Nothing here
 * is duplicated into markup by hand.
 */

/**
 * Where the built site is served from, for canonical and Open Graph URLs.
 *
 * Read by the build only. It is not referenced by anything that runs in the
 * browser, and it must not become so: this module is imported by components,
 * and reaching for `process` from one of them would throw.
 */
export const DEFAULT_ORIGIN = 'https://andifathulms.github.io';

/** Sentences the arena renders, and the description it is described by. */
export const ARENA_LEDE = 'Press left or right. The machine has already guessed which.';
export const ARENA_POINT = 'The machine scores when it guesses your press.';

/** Sentences the landing page renders. */
export const LANDING_HEADLINE = 'The optimal move is public. You still cannot play it.';
export const LANDING_SUB =
  'Matching pennies against five models of you. The machine seals its guess before your press is read.';

export interface RouteMeta {
  /** File in the build output. */
  file: string;
  /** Path under the base, for canonical and sitemap. */
  path: string;
  title: string;
  /** Composed from strings the page itself renders. */
  description: string;
  /** Sitemap priority. The arena is the site. */
  priority: string;
}

export const ROUTES: readonly RouteMeta[] = [
  {
    file: 'index.html',
    path: '',
    title: 'Mind reader',
    description: `${ARENA_LEDE} ${ARENA_POINT}`,
    priority: '1.0',
  },
  {
    file: 'landing.html',
    path: 'landing.html',
    title: "Mind reader: Shannon's 1953 machine, rebuilt",
    description: `${LANDING_HEADLINE} ${LANDING_SUB}`,
    priority: '0.8',
  },
];
