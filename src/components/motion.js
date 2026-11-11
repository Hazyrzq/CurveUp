'use client';

// Shared Motion (framer-motion) presets for the dashboard.
// MotionConfig reducedMotion="user" turns transform animations off for prefers-reduced-motion.

import { MotionConfig, motion } from 'framer-motion';

export const EASE = [0.16, 1, 0.3, 1];

export const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
};

export function MotionProvider({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

// Grid/list whose direct motion children (variants={itemVariants}) fade up one after another.
export function Stagger({ as = 'div', className = '', children, ...rest }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp variants={listVariants} initial="hidden" animate="show" className={className} {...rest}>
      {children}
    </Comp>
  );
}

// Soft spring used by sliding indicators (active tab pill, sidebar active bar).
export const indicatorSpring = { type: 'spring', stiffness: 420, damping: 36, mass: 0.8 };

// White pill behind the active segmented tab; slides between tabs.
// Parent button needs `isolate` (pill sits at -z-10 under the label).
export function TabPill({ layoutId }) {
  return (
    <motion.span
      layoutId={layoutId}
      transition={indicatorSpring}
      aria-hidden="true"
      className="absolute inset-0 -z-10 rounded-lg bg-surface shadow-pill"
    />
  );
}
