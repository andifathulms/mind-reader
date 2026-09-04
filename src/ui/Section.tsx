import type { ReactNode } from 'react';
import './Section.css';

/**
 * A section below the arena. No panels, no cards, no shadows — sections
 * separate by a hairline and generous space (DESIGN.md §4.4).
 */
export function Section({
  id,
  title,
  intro,
  ground = 'yours',
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  ground?: 'yours' | 'machine' | 'archive';
  children: ReactNode;
}) {
  return (
    <section className={`section section--${ground}`} id={id} aria-labelledby={`${id}-title`}>
      <div className="section__inner">
        <header className="section__head">
          <h2 className="section__title" id={`${id}-title`}>
            {title}
          </h2>
          {intro ? <p className="section__intro">{intro}</p> : null}
        </header>
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
}: {
  title: string;
  value?: string;
  note?: ReactNode;
  children?: ReactNode;
  table?: ReactNode;
  wide?: boolean;
}) {
  return (
    <figure className={`figure${wide ? ' figure--wide' : ''}`}>
      <figcaption className="figure__head">
        <h3 className="figure__title">{title}</h3>
        {value ? <p className="figure__value">{value}</p> : null}
        {note ? <p className="figure__note">{note}</p> : null}
      </figcaption>
      {children ? <div className="figure__body">{children}</div> : null}
      {table ? (
        <details className="table-equivalent">
          <summary>Table</summary>
          {table}
        </details>
      ) : null}
    </figure>
  );
}
