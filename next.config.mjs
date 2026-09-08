/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Hangi commit'in yayında olduğu ekrandan görülebilsin — Vercel bu değişkeni
    // her build'de sağlar. Yerelde "local" yazar.
    NEXT_PUBLIC_BUILD_SHA:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  },
};

export default nextConfig;
