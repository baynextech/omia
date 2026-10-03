import { useEffect } from "react";

interface SEOMetaProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  jsonLd?: object;
}

export function SEOMeta({ title, description, keywords, canonicalUrl, ogImage, jsonLd }: SEOMetaProps) {
  useEffect(() => {
    // 1. Title
    const fullTitle = title ? `${title} | Omia Yoga & Pilates` : "Omia - Profesores, Institutos y Tienda de Yoga & Pilates";
    document.title = fullTitle;

    // Helper to set or update meta tag
    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // 2. Standard Meta
    setMetaTag('meta[name="description"]', "name", "description", description);
    if (keywords) {
      setMetaTag('meta[name="keywords"]', "name", "keywords", keywords);
    }

    // 3. OpenGraph
    setMetaTag('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMetaTag('meta[property="og:description"]', "property", "og:description", description);
    if (ogImage) {
      setMetaTag('meta[property="og:image"]', "property", "og:image", ogImage);
    }

    // 4. Twitter Card
    setMetaTag('meta[property="twitter:title"]', "property", "twitter:title", fullTitle);
    setMetaTag('meta[property="twitter:description"]', "property", "twitter:description", description);
    if (ogImage) {
      setMetaTag('meta[property="twitter:image"]', "property", "twitter:image", ogImage);
    }

    // 5. Canonical
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (canonicalUrl) {
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute("href", canonicalUrl);
    }

    // 6. JSON-LD Schema
    let scriptJsonLd = document.querySelector('#schema-jsonld');
    if (jsonLd) {
      if (!scriptJsonLd) {
        scriptJsonLd = document.createElement("script");
        scriptJsonLd.setAttribute("id", "schema-jsonld");
        scriptJsonLd.setAttribute("type", "application/ld+json");
        document.head.appendChild(scriptJsonLd);
      }
      scriptJsonLd.textContent = JSON.stringify(jsonLd);
    } else if (scriptJsonLd) {
      scriptJsonLd.remove();
    }

  }, [title, description, keywords, canonicalUrl, ogImage, jsonLd]);

  return null;
}
