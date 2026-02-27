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
        genarch: {
          primary: "#F2766A",
          secondary: "#F5C75A",
          data: "#89E5E6",
          community: "#D3B3D3",
          neutral: "#F9C9C9",
          action: "#F39C6B",
          passport: "#EFE789",
          bg: "#F7F7F7",
          text: "#333333",
          subtext: "#666666",
          link: "#0066CC",
        },
      },
      fontFamily: {
        sans: ["Inter", "Libre Franklin", "system-ui", "sans-serif"],
        body: ["Roboto", "Open Sans", "system-ui", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
      fontSize: {
        h1: ["2rem", { lineHeight: "1.3", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "1.35", fontWeight: "600" }],
        h3: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};
export default config;
