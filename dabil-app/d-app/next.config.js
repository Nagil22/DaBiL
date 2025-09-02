/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: [
      '5f93b504e168.ngrok-free.app',
      /\.ngrok\.io$/,
      /\.ngrok-free\.app$/
    ]
  }
};

module.exports = nextConfig;