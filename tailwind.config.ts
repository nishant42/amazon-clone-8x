import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Nested under `amazon` so Tailwind generates the token names as given:
      // bg-amazon-dark, text-amazon-link, border-amazon-orange, etc.
      colors: {
        amazon: {
          dark: "#131921",
          light: "#232F3E",
          orange: "#FEBD69",
          link: "#007185",
          star: "#FFA41C",
          badge: "#CC0C39",
          text: "#0F1111",
        },
      },
    },
  },
  plugins: [],
};

export default config;
