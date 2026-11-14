import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Se pone como primer hijo del contenedor de un modal y le da comportamiento de diálogo:
// se anuncia como tal, cierra con Escape, mantiene el foco adentro, lo devuelve al cerrar
// y frena el scroll de la página de fondo.
export function ModalA11y({ onClose, label }: { onClose: () => void; label: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const root = marker.current?.parentElement;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", label);

    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    // El foco entra al primer campo; si no hay, al primer control.
    if (!root.contains(document.activeElement)) {
      const first = root.querySelector<HTMLElement>("input:not([type=hidden]):not([type=checkbox]), textarea, select") || items()[0];
      first?.focus({ preventScroll: true });
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); close.current(); return; }
      if (e.key !== "Tab") return;
      const list = items();
      if (list.length === 0) return;
      const first = list[0], last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !root.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !root.contains(active))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [label]);

  return <span ref={marker} hidden />;
}
