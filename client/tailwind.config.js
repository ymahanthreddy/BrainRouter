/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        input: "hsl(var(--input))",
        muted: {
          foreground: "hsl(var(--muted-foreground))",
        },
      },
      animation: {
        "spin": "spin 2s linear infinite",
      },
    },
  },
  plugins: [],
}
