import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#180C12",
        surface: "#22101A",
        "surface-light": "#2C1523",
        "surface-dark": "#100708",
        "on-background": "#FDEEF3",
        "on-surface": "#FDEEF3",
        "on-surface-muted": "#C8899E",
        primary: "#FFC1D5",
        "primary-container": "#FFE5EE",
        "on-primary": "#3D0820",
        secondary: "#FDEEF3",
        "rose-gold": "#FFC1D5",
        "rosa-blush": "#FDEEF3",
        "glass-surface": "rgba(24, 12, 18, 0.88)",
        "xp-gold": "#E0C36A",
        // rank colors
        "rank-calouro": "#C8899E",
        "rank-comum": "#F9A8C0",
        "rank-devorador": "#A78BFA",
        "rank-rato": "#60A5FA",
        "rank-erudito": "#E0C36A",
        "rank-lendario": "#FFC1D5",
        // rarity
        "rarity-common": "#C8899E",
        "rarity-rare": "#A78BFA",
        "rarity-legendary": "#E0C36A",
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.75rem",
        "3xl": "2.25rem",
      },
      boxShadow: {
        neu: "6px 6px 12px rgba(0,0,0,0.45), -6px -6px 12px rgba(255,255,255,0.03)",
        "neu-inset": "inset 4px 4px 8px rgba(0,0,0,0.45), inset -4px -4px 8px rgba(255,255,255,0.03)",
        "neu-sm": "3px 3px 6px rgba(0,0,0,0.4), -3px -3px 6px rgba(255,255,255,0.03)",
        glow: "0 0 22px rgba(255,193,213,0.55)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        flame: {
          "0%,100%": { transform: "scale(1) rotate(-2deg)", opacity: "0.9" },
          "50%": { transform: "scale(1.15) rotate(2deg)", opacity: "1" },
        },
        "gacha-shake": {
          "0%,100%": { transform: "translateX(0) rotate(0)" },
          "20%": { transform: "translateX(-6px) rotate(-3deg)" },
          "40%": { transform: "translateX(6px) rotate(3deg)" },
          "60%": { transform: "translateX(-4px) rotate(-2deg)" },
          "80%": { transform: "translateX(4px) rotate(2deg)" },
        },
        "gacha-reveal": {
          "0%": { transform: "scale(0.3) rotate(-20deg)", opacity: "0" },
          "60%": { transform: "scale(1.1) rotate(5deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0)", opacity: "1" },
        },
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 14px rgba(255,193,213,0.45)" },
          "50%": { boxShadow: "0 0 30px rgba(255,193,213,0.85)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        flame: "flame 1.2s ease-in-out infinite",
        "gacha-shake": "gacha-shake 0.6s ease-in-out infinite",
        "gacha-reveal": "gacha-reveal 0.8s cubic-bezier(0.2,0.8,0.2,1) forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
