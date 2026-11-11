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
        canvas: '#faf7f3',
        ink: '#1e293b',
        // SDG 9 — Industry, Innovation and Infrastructure. 500 is the official #FD6925.
        // Use 700+ for small text on white (AA contrast); 400–600 for fills, icons, rings.
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
        // Light, airy neutrals (slate). Capped at slate-800 so nothing renders as near-black.
        navy: {
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
        cream: '#fff8f1',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        shell: '0 30px 80px -20px rgba(120, 72, 40, 0.16), 0 4px 14px rgba(30, 41, 59, 0.04)',
        soft: '0 1px 2px rgba(30, 41, 59, 0.04), 0 6px 20px -8px rgba(30, 41, 59, 0.08)',
        lift: '0 4px 8px -2px rgba(30, 41, 59, 0.05), 0 22px 44px -14px rgba(120, 72, 40, 0.20)',
        glow: '0 8px 22px -8px rgba(253, 105, 37, 0.60)',
      },
    },
  },
  plugins: [],
};
