/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.28s ease-out',
      },
      colors: {
        // Dark-mode palette (mirrors the LUCI design system).
        dark: {
          bg: '#0f0f0f',          // page background
          surface: '#1a1a1a',     // cards / panels
          input: '#242424',       // form fields
          'surface-alt': '#242424',
          elevated: '#262626',    // dropdowns / popovers
          border: '#333333',
          text: '#f0f0f0',
          'text-muted': 'rgba(240, 240, 240, 0.75)',
          'text-subtle': 'rgba(240, 240, 240, 0.7)',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
