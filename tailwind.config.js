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
        canvas: '#edf1ef',
        ink: '#0f172a',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        shell: '0 28px 72px rgba(15, 23, 42, 0.09), 0 4px 14px rgba(15, 23, 42, 0.035)',
      },
    },
  },
  plugins: [],
};
