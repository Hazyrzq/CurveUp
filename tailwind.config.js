const { tokens } = require('./design-tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── CurveUp design tokens (dashboard v5) — defined once in design-tokens.js ──
        ...tokens,

        // ── Login page only (design frozen). Do not use in the dashboard. ──
        legacy: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#2b3a50',
          900: '#1e293b',
          950: '#1e293b',
        },
        brand: {
          50: '#fff5ef',
          100: '#ffe7d9',
          200: '#ffcbad',
          300: '#ffa676',
          400: '#fe8547',
          500: '#fd6925',
          600: '#e2541a',
          700: '#bb4114',
          800: '#953517',
          900: '#792e16',
          950: '#411409',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Arial', 'sans-serif'],
      },
      fontSize: {
        title: ['22px', { lineHeight: '30px', fontWeight: '600' }],
        section: ['15px', { lineHeight: '22px', fontWeight: '600' }],
      },
      borderRadius: {
        card: '16px',
        dialog: '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(19, 28, 46, 0.04), 0 8px 24px -12px rgba(19, 28, 46, 0.08)',
        'card-hover': '0 2px 4px rgba(19, 28, 46, 0.05), 0 14px 32px -14px rgba(19, 28, 46, 0.14)',
        pill: '0 1px 2px rgba(19, 28, 46, 0.06), 0 2px 8px -2px rgba(19, 28, 46, 0.08)',
        dialog: '0 24px 64px -16px rgba(11, 19, 36, 0.35)',
        // login page only
        shell: '0 30px 80px -20px rgba(120, 72, 40, 0.16), 0 4px 14px rgba(30, 41, 59, 0.04)',
        glow: '0 8px 22px -8px rgba(253, 105, 37, 0.60)',
      },
    },
  },
  plugins: [],
};
