import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE, absoluteUrl } from "../lib/site";

interface SEOMetaProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: object;
  noindex?: boolean;
}

const DEFAULT_TITLE = "Omia - Profesores, Institutos y Tienda de Yoga & Pilates";
const DEFAULT_IMAGE = "/images/yoga_hero_1779994397642.png";

// Si la imagen o el enlace llegan relativos, se vuelven absolutos: WhatsApp, Instagram y Google no resuelven rutas relativas.
const toAbsolute = (value: string): string => (/^https?:\/\//.test(value) ? value : absoluteUrl(value));

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function SEOMeta({ title, description, keywords, canonicalUrl, ogImage, ogType = "website", jsonLd, noindex }: SEOMetaProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title && title !== DEFAULT_TITLE ? `${title} | Omia Yoga & Pilates` : DEFAULT_TITLE;
    const url = canonicalUrl ? toAbsolute(canonicalUrl) : absoluteUrl(pathname === "/" ? "/" : pathname.replace(/\/$/, ""));
    const image = toAbsolute(ogImage || DEFAULT_IMAGE);
    document.title = fullTitle;

    setMeta("name", "description", description);
    if (keywords) setMeta("name", "keywords", keywords);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    let ld = document.head.querySelector("#schema-jsonld");
    if (jsonLd) {
      if (!ld) {
        ld = document.createElement("script");
        ld.setAttribute("id", "schema-jsonld");
        ld.setAttribute("type", "application/ld+json");
        document.head.appendChild(ld);
      }
      ld.textContent = JSON.stringify(jsonLd);
    } else if (ld) {
      ld.remove();
    }
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, jsonLd, noindex, pathname]);

  return null;
}

// Datos estructurados de la organización, para la home.
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE.url}/#website`, url: `${SITE.url}/`, name: "Omia Yoga & Pilates", inLanguage: "es-AR" },
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: SITE.legalName,
      url: `${SITE.url}/`,
      logo: absoluteUrl(DEFAULT_IMAGE),
      sameAs: [`https://instagram.com/${SITE.instagram}`],
    },
  ],
};
