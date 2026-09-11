import type { ReactNode } from 'react';
import { MakerSignature } from './MakerSignature';

/**
 * The footer, shared by both routes.
 *
 * There were two of these, written out separately, already disagreeing about
 * what they said. One component now, with the notice passed in, because that
 * sentence is the only part that differs between the arena and the landing
 * page.
 *
 * `on-machine` because the footer paints the machine's ground, and everything
 * inside it reads --ink and --ink-soft rather than naming a side.
 */
export function SiteFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="colophon on-machine">
      <div className="colophon__bar">
        <p className="colophon__notice">{children}</p>
        <MakerSignature />
      </div>
    </footer>
  );
}
