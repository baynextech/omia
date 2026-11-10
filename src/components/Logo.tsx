// Logo de Omia (manual de marca v2.0, sección 05): un arco, un punto y cuatro letras de trazo constante.
// El arco y las letras toman el color del texto (currentColor); el punto es siempre Arcilla salvo que se indique.
type Props = { className?: string; dot?: string; title?: string };

/** Símbolo «Portal»: arco de radio r y punto de radio r/3 en su centro. */
export function LogoMark({ className = "h-8 w-auto", dot = "var(--color-arcilla)", title }: Props) {
  return (
    <svg viewBox="0 0 34 37" fill="none" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d="M4 33V17a13 13 0 0 1 26 0v16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="17" cy="17" r="4.33" fill={dot} />
    </svg>
  );
}

/** Logo horizontal (principal): símbolo + logotipo. Ancho mínimo 84 px. */
export function Logo({ className = "h-8 w-auto", dot = "var(--color-arcilla)", title = "Omia" }: Props) {
  return (
    <svg viewBox="0 0 167 37" fill="none" className={className} role="img" aria-label={title}>
      <path d="M4 33V17a13 13 0 0 1 26 0v16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="17" cy="17" r="4.33" fill={dot} />
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <circle cx="69.1" cy="21.9" r="11.6" />
        <path d="M90.2 33.5V18.05a7.75 7.75 0 0 1 15.5 0V33.5M105.7 18.05a7.75 7.75 0 0 1 15.5 0V33.5" />
        <path d="M130.7 10.3v23.2" />
        <circle cx="151.8" cy="21.9" r="11.6" />
        <path d="M163.4 10.3v23.2" />
      </g>
      <circle cx="130.7" cy="4" r="2.4" fill={dot} />
    </svg>
  );
}
