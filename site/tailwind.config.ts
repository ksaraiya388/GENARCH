import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          deep: "#0B1F2F",
          mid: "#132B3C",
          light: "#1A3A4F",
        },
        teal: {
          primary: "#2DD4BF",
          soft: "#1FAFA0",
          dim: "#177A6F",
        },
        cool: {
          light: "#C7D2DA",
          mid: "#94A3B8",
          dark: "#64748B",
        },
        surface: {
          white: "#F8FAFC",
          muted: "#E2E8F0",
        },
        /* legacy aliases for components that still reference genarch-* */
        genarch: {
          primary: "#2DD4BF",
          secondary: "#1FAFA0",
          data: "#2DD4BF",
          community: "#94A3B8",
          neutral: "#132B3C",
          action: "#2DD4BF",
          passport: "#1FAFA0",
          bg: "#0B1F2F",
          text: "#F8FAFC",
          subtext: "#C7D2DA",
          link: "#2DD4BF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Fira Code", "Consolas", "monospace"],
      },
      fontSize: {
        h1: ["2.25rem", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
