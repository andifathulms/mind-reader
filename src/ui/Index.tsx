import { useCallback, useEffect, useRef, useState } from 'react';
import './Index.css';

export interface IndexEntry {
  id: string;
  label: string;
  /** The short form, for the phone's rail where there is no room for prose. */
  short: string;
}

export const SECTIONS: IndexEntry[] = [
  { id: 'arena', label: 'The arena', short: 'Play' },
  { id: 'ensemble', label: 'The ensemble', short: 'Ensemble' },
  { id: 'controls', label: 'Settings', short: 'Settings' },
  { id: 'portrait', label: 'The portrait', short: 'Portrait' },
  { id: 'lab', label: 'Strategy lab', short: 'Lab' },
  { id: 'rematch', label: 'The rematch', short: 'Rematch' },
  { id: 'archive', label: 'The archive', short: 'Archive' },
  { id: 'export', label: 'Export', short: 'Export' },
];

/**
 * The index, and the read-through line above it.
 *
 * Seven sections sat below the fold with nothing naming them, which made a
 * scroll the only way to find out the app had a second half. The rail names
 * them and says where you are; it stays out of the arena entirely, because the
 * first screen is for playing and a navigation chrome over it would be the
 * onboarding this app deliberately does not have.
 *
 * Position comes from a scroll listener writing one custom property, not from
 * React state: the progress line moves every frame and re-rendering a component
 * tree at that rate to move a 2px rule would be absurd.
 */
export function SiteIndex() {
  const [active, setActive] = useState('arena');
  const [past, setPast] = useState(false);
  const line = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const span = doc.scrollHeight - window.innerHeight;
      const progress = span <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / span));
      line.current?.style.setProperty('--progress', progress.toFixed(4));
      // The rail appears once the arena is most of the way off the screen, so
      // it never overlaps a tap target the player might be aiming at.
      setPast(window.scrollY > window.innerHeight * 0.6);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    if (targets.length === 0 || typeof IntersectionObserver === 'undefined') return;

    // The section owning the middle band of the viewport is the one you are
    // reading. A plain "topmost visible" test flickers between two sections at
    // every boundary.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const jump = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <div className="progress" ref={line} data-shown={past || undefined} aria-hidden="true">
        <span className="progress__line" />
      </div>

      <nav className={`index${past ? ' index--shown' : ''}`} aria-label="Sections">
        <ol className="index__list">
          {SECTIONS.map((entry, i) => (
            <li className="index__item" key={entry.id}>
              <button
                type="button"
                className={`index__link${active === entry.id ? ' index__link--active' : ''}`}
                aria-current={active === entry.id ? 'true' : undefined}
                onClick={() => jump(entry.id)}
              >
                <span className="index__tick" aria-hidden="true" />
                <span className="index__number" aria-hidden="true">
                  {String(i).padStart(2, '0')}
                </span>
                <span className="index__label">{entry.label}</span>
                <span className="index__short" aria-hidden="true">
                  {entry.short}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
