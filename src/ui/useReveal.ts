import { useEffect, useRef } from 'react';

/**
 * Scroll reveal.
 *
 * One shared IntersectionObserver for the whole document rather than one per
 * element: the analysis has a few dozen revealing pieces and a few dozen
 * observers is a few dozen callbacks on every scroll. Elements register
 * themselves and are unobserved the moment they have been shown, because a
 * reveal happens once and an element that has arrived is no longer interesting.
 *
 * If the API is missing the element is shown immediately. A reveal is a
 * flourish; content that depends on a flourish to become visible is a bug.
 */
type Registry = { observer: IntersectionObserver } | null;

let registry: Registry = null;

function shared(): Registry {
  if (registry) return registry;
  if (typeof IntersectionObserver === 'undefined') return null;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-reveal', 'shown');
        observer.unobserve(entry.target);
      }
    },
    // A little before the element reaches the fold, so it is settled by the
    // time it is properly in view rather than animating under the reader's eye.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
  );
  registry = { observer };
  return registry;
}

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const shared_ = shared();
    if (!shared_) {
      element.setAttribute('data-reveal', 'shown');
      return;
    }
    shared_.observer.observe(element);
    return () => shared_.observer.unobserve(element);
  }, []);

  return ref;
}
