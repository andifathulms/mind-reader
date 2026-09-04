import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useReveal } from './useReveal';

/**
 * Wraps a piece of the analysis so it arrives on scroll rather than being
 * already there. `delay` staggers siblings; it is a count of steps, not
 * milliseconds, so a stagger cannot be tuned into something slow enough to
 * make the reader wait.
 */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  rise,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  rise?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={className}
      data-reveal=""
      style={
        {
          '--reveal-delay': `${Math.min(delay, 6) * 55}ms`,
          ...(rise === undefined ? null : { '--reveal-rise': `${rise}px` }),
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
