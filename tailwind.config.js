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
        cascades: '#123C3F',
        pacific:  '#1B5B5F',
        calypso:  '#00A2AF',
        seafoam:  '#00AAB8',
        chalk:    '#E1E5EE',
        silver:   '#F4F5F7',
        blanc:    '#FCFCFD',
        navy: {
          DEFAULT: '#123C3F',
          light:   '#1B5B5F',
        },
        teal: {
          DEFAULT: '#00A2AF',
          light:   '#cef4f6',
        },
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans:  ['Satoshi', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
