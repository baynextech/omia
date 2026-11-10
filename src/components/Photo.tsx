// Foto de una ficha. Si todavía no cargó ninguna, se muestra la inicial en lugar de una imagen vacía
// (ni de una foto de stock que parezca ser de otra persona).
export function Photo({ src, name, className = "", ...rest }: { src?: string | null; name: string; className?: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  if (src) return <img src={src} alt={name} className={className} referrerPolicy="no-referrer" {...rest} />;
  return (
    <div className={`${className} bg-gradient-to-br from-salvia-claro to-salvia flex items-center justify-center text-bosque font-serif`} role="img" aria-label={name}>
      <span className="text-6xl opacity-90">{(name || "?").trim().charAt(0).toUpperCase()}</span>
    </div>
  );
}

// Misma idea que <Photo>, para los lugares que necesitan una URL de imagen.
export function placeholderFor(name: string): string {
  const initial = (name || "?").trim().charAt(0).toUpperCase().replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9DCCF"/><stop offset="1" stop-color="#8CAE99"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><text x="400" y="360" font-family="Gloock,Georgia,serif" font-size="220" fill="#1C3829" fill-opacity="0.9" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
