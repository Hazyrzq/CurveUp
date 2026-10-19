import { useEffect } from 'react';

/**
 * Locks body scroll when `lock` is true.
 * Uses `overflow: hidden` + `overscroll-behavior: none` instead of
 * `position: fixed` to avoid mobile-keyboard viewport quirks
 * (blank space at the bottom when the virtual keyboard opens).
 */
export function useScrollLock(lock) {
  useEffect(() => {
    if (!lock) return undefined;

    const html = document.documentElement;
    const body = document.body;

    // Save the current scroll position so we can restore it on unlock
    const scrollY = window.scrollY || window.pageYOffset || 0;

    // Save previous styles
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    // Lock – simple overflow:hidden approach (no position:fixed)
    // This avoids the blank-space issue caused by fixed positioning
    // when the mobile virtual keyboard is open.
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    // Add scroll-locked class for any CSS rules targeting it
    html.classList.add('scroll-locked');
    body.classList.add('scroll-locked');

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      html.classList.remove('scroll-locked');
      body.classList.remove('scroll-locked');

      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [lock]);
}
