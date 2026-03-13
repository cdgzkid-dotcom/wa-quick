const withPWA = require('next-pwa')({
  dest: 'public',
  register: false,  // sw-custom.js is registered manually in page.tsx — prevents two SWs competing
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  customWorkerDir: 'worker',
  publicExcludes: ['!icons/**/*', '!sw-custom.js'],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
