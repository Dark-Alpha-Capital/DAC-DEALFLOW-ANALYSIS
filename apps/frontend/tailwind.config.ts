import type { Config } from "tailwindcss";

/** Content roots for Tailwind v4 + IDE / shadcn; build uses @tailwindcss/vite scanning. */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
} satisfies Config;
