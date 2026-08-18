import type { Config } from 'tailwindcss';

// Identidade Think IT (extraída do Book Executivo): tema claro, teal + lime.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F8F8',        // fundo da aplicação
        surface: '#FFFFFF',   // cartões
        surface2: '#EEF1F1',  // preenchimentos sutis / inputs
        border: '#E6E7E7',
        ink: '#21242B',       // texto principal
        gray: '#5A6066',
        muted: '#9AA0A6',
        brand: {              // teal primário
          DEFAULT: '#277471',
          600: '#1F605D',
          deep: '#005b58',    // primary (Cyber Intelligence Framework)
        },
        accent: '#C8D541',    // lime secundário
        dark: '#21242B',      // sidebar / cards de destaque
        teal: '#277471',
        lime: '#C8D541',
        warn: '#E88A3A',      // laranja (ação)
        danger: '#ba1a1a',    // vermelho (negativo)
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(33,36,43,.04), 0 6px 20px rgba(33,36,43,.06)',
      },
    },
  },
  plugins: [],
};
export default config;
