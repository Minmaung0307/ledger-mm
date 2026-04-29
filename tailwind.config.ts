// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // <--- ဒီစာကြောင်း သေချာပေါက် ပါရပါမယ်
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;