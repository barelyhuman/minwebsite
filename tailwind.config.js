const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: colors.zinc[900],
        overlay: colors.zinc[800],
        surface: colors.zinc[700]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')
  ]
}
