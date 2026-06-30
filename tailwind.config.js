/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          900: "#0f1422",
          800: "#1a2138",
          700: "#252e4a",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f7f8fc",
          sunken: "#eef0f7",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 20, 34, 0.04), 0 8px 24px rgba(15, 20, 34, 0.06)",
        "card-hover": "0 2px 4px rgba(15, 20, 34, 0.06), 0 16px 40px rgba(15, 20, 34, 0.10)",
        inset: "inset 0 1px 2px rgba(15, 20, 34, 0.04)",
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "collapse-up": {
          "0%": { opacity: "0", maxHeight: "0px" },
          "100%": { opacity: "1", maxHeight: "600px" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-468px 0" },
          "100%": { backgroundPosition: "468px 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out",
        "collapse-up": "collapse-up 0.4s ease-out",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
