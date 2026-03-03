import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        atlas: "#F2766A",
        briefs: "#F5C75A",
        graph: "#89E5E6",
        community: "#D3B3D3",
        neutralPanel: "#F9C9C9",
        action: "#F39C6B",
        passport: "#EFE789",
        frame: "#F7F7F7",
        textPrimary: "#333333",
        textSecondary: "#666666",
        link: "#0066CC"
      },
      borderRadius: {
        card: "10px"
      },
      boxShadow: {
        soft: "0 2px 12px rgba(0, 0, 0, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
