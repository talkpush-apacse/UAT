/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // pdfjs-dist (a pdf-parse dependency) breaks when webpack bundles it for
    // the server — keep it as a real Node require instead.
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
    // @napi-rs/canvas (pdfjs-dist's DOMMatrix polyfill) ships a platform-
    // specific native .node binary, picked via a dynamic require that
    // Vercel's output tracing can't follow — the deployed function silently
    // ships without it, and pdf-parse fails at runtime with "DOMMatrix is
    // not defined". Force the whole package family into the trace.
    outputFileTracingIncludes: {
      "/api/mcp/**": ["./node_modules/@napi-rs/canvas*/**/*"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
}

export default nextConfig
