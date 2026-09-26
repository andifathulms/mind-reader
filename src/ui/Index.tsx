import { Children, isValidElement, useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import './Index.css';

export interface IndexEntry {
  id: string;
  label: string;
}

/**
 * The views below the arena, in order. The numbers the sections print come
 * from this list, so the tabs and the pages can never disagree about what view
 * four is.
 */
export const SECTIONS: IndexEntry[] = [
  { id: 'seal', label: 'Seal' },
  { id: 'ensemble', label: 'Ensemble' },
  { id: 'controls', label: 'Settings' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'lab', label: 'Lab' },
  { id: 'rematch', label: 'Rematch' },
  { id: 'archive', label: 'Archive' },
  { id: 'export', label: 'Export' },
];

/**
 * The analysis, one view at a time.
 *
 * It was eight sections in one 14,000-pixel scroll with a rail to jump
 * between them. Each is now a view behind a tab: the tab bar sticks to the top
 * while you read, and choosing a view brings you back to the top of it.
 *
 * Views that are not showing stay mounted, hidden. A rematch that is running
 * keeps running when you look at something else, a lab result is still there
 * when you come back, and on paper every view prints (print.css).
 *
 * The active view is component state rather than part of the URL: the hash
 * already carries the machine's configuration (CLAUDE.md §9), and which page of
 * the analysis you were reading is not part of a session anyone would share.
 *
 * `children` are the views, each keyed by its section id.
 */
export function Analysis({ children }: { children: ReactNode }) {
  const views = Children.toArray(children).filter(
    (child): child is ReactElement => isValidElement(child) && typeof child.key === 'string',
  );
  const idOf = (child: ReactElement) => String(child.key).replace(/^\.\$/, '');

  const [active, setActive] = useState(SECTIONS[0]?.id ?? '');
  const root = useRef<HTMLElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const indicator = useRef<HTMLSpanElement | null>(null);

  // The indicator slides to the active tab. Measured rather than computed from
  // an index, because the tabs are as wide as their words.
  useLayoutEffect(() => {
    const bar = list.current;
    const mark = indicator.current;
    if (!bar || !mark) return;
    const place = () => {
      const tab = bar.querySelector<HTMLElement>(`[data-view="${active}"]`);
      if (!tab) return;
      mark.style.setProperty('--x', `${tab.offsetLeft}px`);
      mark.style.setProperty('--w', `${tab.offsetWidth}px`);
      // On a phone the bar scrolls sideways; keep the chosen tab in sight.
      const left = tab.offsetLeft - bar.scrollLeft;
      if (left < 0 || left + tab.offsetWidth > bar.clientWidth) {
        bar.scrollTo({ left: tab.offsetLeft - 16, behavior: 'smooth' });
      }
    };
    place();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(place);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [active]);

  const choose = useCallback((id: string, focus = false) => {
    setActive(id);
    if (focus) list.current?.querySelector<HTMLElement>(`[data-view="${id}"]`)?.focus();
    // A new view starts at its top. Only scroll when the reader is already
    // below the top of the analysis; from the arena, stay put.
    const top = root.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) {
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: window.scrollY + top, behavior: still ? 'auto' : 'smooth' });
    }
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = SECTIONS.findIndex((s) => s.id === active);
    const last = SECTIONS.length - 1;
    const to =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (to === null) return;
    event.preventDefault();
    const next = SECTIONS[to];
    if (next) choose(next.id, true);
  };

  return (
    <main className="analysis" id="analysis" ref={root}>
      <nav className="tabs" aria-label="Analysis">
        <div
          className="tabs__list"
          role="tablist"
          aria-label="Analysis views"
          ref={list}
          onKeyDown={onKeyDown}
        >
          <span className="tabs__indicator" ref={indicator} aria-hidden="true" />
          {SECTIONS.map((entry, i) => {
            const selected = entry.id === active;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`tab-${entry.id}`}
                data-view={entry.id}
                aria-selected={selected}
                aria-controls={`view-${entry.id}`}
                tabIndex={selected ? 0 : -1}
                className={`tabs__tab${selected ? ' tabs__tab--active' : ''}`}
                onClick={() => choose(entry.id)}
              >
                <span className="tabs__number" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {entry.label}
              </button>
            );
          })}
        </div>
      </nav>

      {views.map((child) => {
        const id = idOf(child);
        const shown = id === active;
        return (
          <div
            key={id}
            className={`view${shown ? ' view--active' : ''}`}
            role="tabpanel"
            id={`view-${id}`}
            aria-labelledby={`tab-${id}`}
            hidden={!shown}
          >
            {child}
          </div>
        );
      })}
    </main>
  );
}
