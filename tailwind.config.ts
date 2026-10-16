import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF7F5",
        blush: "#F4C7CE",
        lavender: "#C9B8F0",
        plum: "#51445E",
        rose: "#B66685",
        success: "#517C65",
        danger: "#B84F62",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: { card: "1.25rem" },
    },
  },
  plugins: [],
};
export default config;
