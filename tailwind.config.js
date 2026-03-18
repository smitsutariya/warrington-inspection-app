/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a2744',
          light: '#2d3f6b',
        },
        accent: '#c8a96e',
        teal: {
          DEFAULT: '#0e7c6b',
          light: '#e1f5ee',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        sans: ['Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
