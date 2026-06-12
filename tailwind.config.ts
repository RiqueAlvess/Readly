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
        background: "#1F2D26",
        surface: "#24332B",
        "surface-light": "#2C3D33",
        "surface-dark": "#192319",
        "on-background": "#F7EAE6",
        "on-surface": "#F7EAE6",
        "on-surface-muted": "#A9B8AE",
        primary: "#D4A89C",
        "primary-container": "#F7EAE6",
        "on-primary": "#1F2D26",
        secondary: "#F7EAE6",
        "rose-gold": "#D4A89C",
        "rosa-blush": "#F7EAE6",
        "glass-surface": "rgba(31, 45, 38, 0.8)",
        "xp-gold": "#D4A89C",
        // rank colors
        "rank-calouro": "#A9B8AE",
        "rank-comum": "#8FB98F",
        "rank-devorador": "#6FA8DC",
        "rank-rato": "#B07FD4",
        "rank-erudito": "#E0B341",
        "rank-lendario": "#D4A89C",
        // rarity
        "rarity-common": "#A9B8AE",
        "rarity-rare": "#6FA8DC",
        "rarity-legendary": "#E0B341",
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
        neu: "6px 6px 12px rgba(0,0,0,0.35), -6px -6px 12px rgba(255,255,255,0.03)",
        "neu-inset": "inset 4px 4px 8px rgba(0,0,0,0.35), inset -4px -4px 8px rgba(255,255,255,0.03)",
        "neu-sm": "3px 3px 6px rgba(0,0,0,0.3), -3px -3px 6px rgba(255,255,255,0.03)",
        glow: "0 0 20px rgba(212,168,156,0.45)",
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
          "0%,100%": { boxShadow: "0 0 14px rgba(212,168,156,0.4)" },
          "50%": { boxShadow: "0 0 28px rgba(212,168,156,0.8)" },
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
