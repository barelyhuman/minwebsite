/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,html}"],
  theme: {
    extend: {
      colors:{
        base:"var(--base)"
      }
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
