import React, { useEffect, useRef, useState } from 'react';

interface LazyVisibleCardProps {
  children: React.ReactNode;
  minHeight?: string;
  rootMargin?: string;
}

/**
 * Defers mounting heavy charts/tables until near the viewport via IntersectionObserver.
 * Keeps initial page load fast and prevents simultaneous off-screen SVG/WebGL rendering lag.
 */
export const LazyVisibleCard: React.FC<LazyVisibleCardProps> = ({
  children,
  minHeight = 'min-h-[220px]',
  rootMargin = '220px',
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={visible ? 'h-full' : `h-full ${minHeight}`}>
      {visible ? (
        children
      ) : (
        <div
          className={`bento-card rounded-2xl p-5 h-full flex items-center justify-center text-xs font-mono-num text-[var(--text-muted)] ${minHeight}`}
        >
          Rendering on scroll...
        </div>
      )}
    </div>
  );
};
