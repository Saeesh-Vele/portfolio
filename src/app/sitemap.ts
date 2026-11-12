import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

/** One page. The resume PDF is linked from it, so crawlers find that too. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl}/`, changeFrequency: "monthly", priority: 1 }];
}
