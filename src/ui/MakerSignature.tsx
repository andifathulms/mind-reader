import './MakerSignature.css';

/**
 * The maker's mark.
 *
 * Personal credit, and deliberately not part of the colophon beside it: that
 * paragraph is a statement about the sources and about what the app does with
 * your presses, and merging a byline into it would make both read as one legal
 * notice. It sits on the same seam instead of earning a rule of its own.
 *
 * Everything identifying lives in the two constants below, so updating a
 * handle or adding a platform is one line and never a hunt through markup.
 */
const MAKER = {
  name: 'Andi Fathul Mukminin',
  portfolio: 'https://andifathulms.github.io/en/',
};

interface MakerLink {
  id: string;
  /** The accessible name. The icon carries no text of its own. */
  label: string;
  href: string;
  icon: () => JSX.Element;
}

/*
 * Icons are inlined rather than imported. The app has no runtime dependency
 * beyond React (CLAUDE.md) and every other drawing in it is bespoke SVG, so an
 * icon package would be the first exception to both.
 *
 * All four are drawn on a 24 box and inherit currentColor.
 */
const Globe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <circle cx="12" cy="12" r="9.25" />
    <ellipse cx="12" cy="12" rx="4.1" ry="9.25" />
    <path d="M2.9 9.1h18.2M2.9 14.9h18.2" strokeLinecap="round" />
  </svg>
);

const GitHub = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const LinkedIn = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const Instagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.25" />
    <circle cx="12" cy="12" r="4.25" />
    <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);

const LINKS: readonly MakerLink[] = [
  { id: 'portfolio', label: 'Portfolio', href: MAKER.portfolio, icon: Globe },
  { id: 'github', label: 'GitHub', href: 'https://github.com/andifathulms', icon: GitHub },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/andifathulmukminin/',
    icon: LinkedIn,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/andifathulms/',
    icon: Instagram,
  },
];

export function MakerSignature() {
  const year = new Date().getFullYear();

  return (
    <div className="maker">
      <p className="maker__line">
        Designed &amp; built by{' '}
        <a
          className="maker__name"
          href={MAKER.portfolio}
          target="_blank"
          rel="noopener noreferrer"
        >
          {MAKER.name}
        </a>{' '}
        <span className="maker__sep" aria-hidden="true">
          ·
        </span>{' '}
        {/* The archive's monospace, tabular, because it is a measured thing. */}
        <span className="maker__year">© {year}</span>
      </p>

      <ul className="maker__links">
        {LINKS.map(({ id, label, href, icon: Icon }) => (
          <li key={id}>
            <a
              className="maker__icon"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
            >
              <Icon />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
