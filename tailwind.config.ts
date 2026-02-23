import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: '#0B2A62',
          dark: '#071D44',
          light: '#EEF2FF',
          teal: '#0B2A62',
          bg: '#ECE5DD',
        },
      },
    },
  },
  plugins: [],
}

export default config
