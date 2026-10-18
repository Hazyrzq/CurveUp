import { useEffect } from 'react';

export function useScrollLock(lock) {
  useEffect(() => {
    if (!lock) return undefined;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.classList.add('scroll-locked');
    body.classList.add('scroll-locked');

    return () => {
      html.classList.remove('scroll-locked');
      body.classList.remove('scroll-locked');
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [lock]);
}
