/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Same palette names as the web app (apps/web/app/globals.css) so
      // class names transfer 1:1 between the two UIs.
      colors: {
        "f1-red": "#CF2637",
        "f1-red-hover": "#B21E2D",
        "f1-black": "#2A2B2A",
        "f1-white": "#F7F7F7",
        "f1-purple": "#A06CD5",
        "f1-amber": "#FFB100",
        "f1-green": "#44AF69",
        "f1-blue": "#3C91E6",
      },
    },
  },
  plugins: [],
};
