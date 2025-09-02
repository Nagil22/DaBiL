/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove the invalid experimental option
  // experimental: {
  //   allowedDevOrigins: [...] // ← This causes the warning
  // }
};

module.exports = nextConfig;