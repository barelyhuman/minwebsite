import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,tsx,jsx}'],
  theme: {
    extend: {},
    fontFamily: {
      sans: "'Inter',sans-serif",
    },
  },
  plugins: [forms],
}
