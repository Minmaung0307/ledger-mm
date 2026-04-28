import type { Config } from "tailwindcss";

const config: Config = {
  // အရေးကြီးဆုံး- 'class' mode ကို သုံးမှ ကျွန်တော်တို့ code က အလုပ်လုပ်မှာပါ
  darkMode: "class", 
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;