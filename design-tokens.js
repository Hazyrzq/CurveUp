// CurveUp design tokens (dashboard v5) — the single source of truth for colors.
// Used by tailwind.config.js (class names) and by JS that needs raw values (Chart.js).
// Colors are taken from the login page: navy visual panel + SDG 9 orange.

const tokens = {
  navy: { 950: '#0b1324', 900: '#131c2e', 800: '#1f2a40', 600: '#36425c', 300: '#aab5ca' },
  // 700 is a text-only shade so small orange text meets WCAG AA (5.4:1 on white)
  orange: { 50: '#fff5ef', 100: '#ffe7d9', 500: '#fd6925', 600: '#e2541a', 700: '#bb4114' },
  canvas: '#faf7f3',
  surface: '#ffffff',
  cream: '#fff8f1',
  line: '#ece6df',
  grid: '#f1ece6',
  ink: { DEFAULT: '#131c2e', secondary: '#5b6478', muted: '#8a93a6' },
  success: { DEFAULT: '#16a34a', text: '#15803d', soft: '#ecfdf3' },
  warning: { DEFAULT: '#d97706', text: '#b45309', soft: '#fffbeb' },
  danger: { DEFAULT: '#dc2626', soft: '#fef2f2' },
};

// rgba() helper for canvas drawing (Chart.js) — keeps alpha variants tied to the tokens
function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

module.exports = { tokens, alpha };
