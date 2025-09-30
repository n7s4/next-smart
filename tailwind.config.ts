/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [
    require("tailwindcss-animate"), // eslint-disable-line @typescript-eslint/no-require-imports
    require("@tailwindcss/typography"), // eslint-disable-line @typescript-eslint/no-require-imports
  ],
};
