/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",

        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",

        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",

        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",

        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",

        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",

        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        card: "var(--shadow-card)",
      },

      keyframes: {
        polaroidCycle: {
          "0%":   { opacity: "0", transform: "translate3d(26px, 14px, -60px) rotate(7deg) scale(0.92)" },
          "10%":  { opacity: "1" },
          "18%":  { opacity: "1", transform: "translate3d(0px, 0px, 120px) rotate(0deg) scale(1)" },
          "32%":  { opacity: "1", transform: "translate3d(0px, 0px, 120px) rotate(0deg) scale(1)" },
          "42%":  { opacity: "0", transform: "translate3d(-28px, -10px, -80px) rotate(-8deg) scale(0.9)" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        polaroid: "polaroidCycle 25s infinite",
      },
    },
  },
  plugins: [],
};
