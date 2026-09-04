import type { ReactNode } from 'react';
import { Reveal } from './Reveal';
import { SECTIONS } from './Index';
import './Section.css';

/**
 * A section below the arena.
 *
 * Numbered, because seven of them in a single scroll want an order the reader
 * can hold; the numbers come from the index's own list so the rail and the page
 * can never disagree about what section four is. Still no cards and no shadows
 * — the head is a two-column arrangement of a marker and a heading, and the
 * hairline plus the change of ground does the separating (DESIGN.md §4.4).
 */
export function Section({
  id,
  title,
  intro,
  eyebrow,
  ground = 'yours',
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  eyebrow?: string;
  ground?: 'yours' | 'machine' | 'archive';
  children: ReactNode;
}) {
  const number = SECTIONS.findIndex((entry) => entry.id === id);

  return (
    <section
      className={`section section--${ground}${ground === 'machine' ? ' on-machine' : ''}`}
      id={id}
      aria-labelledby={`${id}-title`}
    >
      <div className="section__inner">
        <Reveal as="header" className="section__head">
          <div className="section__marker" aria-hidden="true">
            <span className="section__number">{String(Math.max(0, number)).padStart(2, '0')}</span>
            <span className="section__rule" />
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          </div>
          <div className="section__headings">
            <h2 className="section__title" id={`${id}-title`}>
              {title}
            </h2>
            {intro ? <p className="section__intro">{intro}</p> : null}
          </div>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

/** A measurement: a heading, a figure, the drawing, and its table equivalent. */
export function Figure({
  title,
  value,
  note,
  children,
  table,
  wide = false,
  delay = 0,
}: {
  title: string;
  value?: string;
  note?: ReactNode;
  children?: ReactNode;
  table?: ReactNode;
  wide?: boolean;
  delay?: number;
}) {
  return (
    <Reveal as="figure" className={`figure${wide ? ' figure--wide' : ''}`} delay={delay}>
      <figcaption className="figure__head">
        <h3 className="figure__title">{title}</h3>
        {value ? <p className="figure__value numeral">{value}</p> : null}
        {note ? <p className="figure__note">{note}</p> : null}
      </figcaption>
      {children ? <div className="figure__body">{children}</div> : null}
      {table ? (
        <details className="table-equivalent">
          <summary>Table</summary>
          {table}
        </details>
      ) : null}
    </Reveal>
  );
}
