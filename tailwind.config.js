/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0d9488",  // teal tone
        accent: "#f59e0b",
        neutral: "#1f2937",
      },
    },
  },
  plugins: [],
};
