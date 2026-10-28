import type { MetadataRoute } from "next";

// Makes the app installable on PC and phone, so it opens like a normal program.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gestionale Flussi",
    short_name: "Flussi",
    description: "Movimento clienti e modulo ISTAT",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F7F5",
    theme_color: "#111111",
    lang: "it",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
