import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orliqo",
    short_name: "Orliqo",
    description: "AI-powered B2B outreach for responsible prospecting, campaigns, conversations, and performance.",
    start_url: "/app/dashboard",
    display: "standalone",
    background_color: "#f8f9fb",
    theme_color: "#101114",
    icons: [{ src: "/brand/orliqo-mark.png", sizes: "1254x1254", type: "image/png", purpose: "any" }],
  };
}
