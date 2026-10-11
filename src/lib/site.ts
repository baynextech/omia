// Datos del sitio y del titular. Se pueden sobrescribir al compilar con las variables VITE_* (ver .env.example)
// para no tocar el código cuando cambie la razón social, el CUIT o el mail de contacto.
export const SITE = {
  url: (import.meta.env.VITE_SITE_URL || "https://omia.site").replace(/\/$/, ""),
  name: "Omia",
  legalName: import.meta.env.VITE_LEGAL_NAME || "Omia Bienestar",
  cuit: import.meta.env.VITE_LEGAL_CUIT || "",
  address: import.meta.env.VITE_LEGAL_ADDRESS || "Ciudad Autónoma de Buenos Aires, Argentina",
  email: import.meta.env.VITE_CONTACT_EMAIL || "hola@omia.site",
  whatsapp: (import.meta.env.VITE_WHATSAPP || "").replace(/\D/g, ""),
  instagram: import.meta.env.VITE_INSTAGRAM || "omiayoga.ar",
  // Analítica: cada una se activa solo si se define su ID.
  gaId: import.meta.env.VITE_GA_ID || "",
  metaPixelId: import.meta.env.VITE_META_PIXEL_ID || "",
  googleSiteVerification: import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || "",
  lastLegalUpdate: "11 de octubre de 2026",
};

export const absoluteUrl = (path: string): string => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
