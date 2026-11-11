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
        canvas: '#f3f5f9',
        ink: '#0b1324',
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
        navy: {
          50: '#f4f6fa',
          100: '#e6eaf2',
          200: '#cfd6e3',
          300: '#aab5ca',
          400: '#7c8baa',
          500: '#5a6a8c',
          600: '#455372',
          700: '#36425c',
          800: '#1f2a40',
          900: '#131c2e',
          950: '#0b1324',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        shell: '0 30px 80px -12px rgba(11, 19, 36, 0.14), 0 4px 14px rgba(11, 19, 36, 0.04)',
        soft: '0 1px 2px rgba(11, 19, 36, 0.04), 0 8px 24px -6px rgba(11, 19, 36, 0.08)',
        lift: '0 2px 4px rgba(11, 19, 36, 0.04), 0 18px 40px -10px rgba(11, 19, 36, 0.16)',
        glow: '0 8px 24px -6px rgba(253, 105, 37, 0.45)',
      },
    },
  },
  plugins: [],
};
