'use client';

import React, { useEffect, useState } from 'react';

/**
 * AnimatedCounter
 * Smoothly animates numbers from previous to target value using requestAnimationFrame.
 *
 * @param {number|string} value - The target number or string containing a number (e.g. 45.8, "45.8%")
 * @param {number} [duration=800] - Animation duration in ms
 * @param {number} [decimals] - Optional decimal places. If omitted, inferred from value.
 * @param {string} [prefix=""] - String before the number (e.g. "+")
 * @param {string} [suffix=""] - String after the number (e.g. "%")
 * @param {string} [className=""] - Extra CSS classes
 */
export default function AnimatedCounter({
  value,
  duration = 800,
  decimals,
  prefix = '',
  suffix = '',
  className = '',
}) {
  // Extract number from input if passed as a string like "45.8%"
  const cleanNumber = typeof value === 'number' 
    ? value 
    : parseFloat(String(value || '').replace(/[^\d.-]/g, ''));

  const isNumeric = Number.isFinite(cleanNumber);

  // Auto-detect decimals if not explicitly provided
  const targetDecimals = decimals !== undefined
    ? decimals
    : typeof value === 'string' && value.includes('.')
    ? (value.split('.')[1] || '').replace(/[^\d]/g, '').length
    : typeof cleanNumber === 'number' && !Number.isInteger(cleanNumber)
    ? 2
    : 0;

  const [displayValue, setDisplayValue] = useState(isNumeric ? cleanNumber : 0);

  useEffect(() => {
    if (!isNumeric) return;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(cleanNumber);
      return;
    }

    let startTimestamp = null;
    const startValue = displayValue;
    const difference = cleanNumber - startValue;

    if (Math.abs(difference) < 0.001) {
      setDisplayValue(cleanNumber);
      return;
    }

    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out expo curve for snappy start and gentle settle
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + difference * ease;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(cleanNumber);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [cleanNumber, duration, isNumeric]);

  if (!isNumeric) {
    return <span className={className}>{value}</span>;
  }

  const formatted = displayValue.toLocaleString('en-US', {
    minimumFractionDigits: targetDecimals,
    maximumFractionDigits: targetDecimals,
  });

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
