/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--base)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')
  ]
}
