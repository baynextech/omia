// Dirección propia de cada ficha: omia.site/profesor/<slug>. Si todavía no tiene slug, se usa el id.
export const profileUrl = (t: { id: string; slug?: string | null }) => `/profesor/${t.slug || t.id}`;
