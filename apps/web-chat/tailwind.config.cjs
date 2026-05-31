/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  daisyui: {
    themes: [
      {
        chat: {
          primary: "#075e54",
          secondary: "#128c7e",
          accent: "#25d366",
          neutral: "#1f2937",
          "base-100": "#f0f2f5",
          info: "#34b7f1",
          success: "#25d366",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
    ],
  },
  plugins: [require("daisyui")],
};
