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
    // specific native .node binary, and pdfjs-dist itself loads its worker
    // (pdf.worker.mjs) via a dynamic path at runtime — Vercel's output
    // tracing can't follow either, so the deployed function silently ships
    // without them. Force both package trees into the trace.
    outputFileTracingIncludes: {
      "/api/mcp/**": [
        "./node_modules/@napi-rs/canvas*/**/*",
        "./node_modules/pdfjs-dist/**/*",
      ],
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
