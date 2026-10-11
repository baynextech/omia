import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Fragment } from "react";
import { apiFetch } from "../lib/api";
import { DEFAULTS, Pair, Value } from "../lib/content";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const CACHE_KEY = "omia_content";

// Las imágenes subidas desde el panel viven en la API: se completa la dirección.
export const mediaUrl = (value: string): string => (value.startsWith("/api/media/") ? `${API_BASE}${value}` : value);

interface ContentApi {
  /** Texto del campo (el cambiado desde el panel o, si no hay, el original). */
  t: (key: string) => string;
  /** Lista de líneas. */
  list: (key: string) => string[];
  /** Lista de pares título/descripción o pregunta/respuesta. */
  pairs: (key: string) => Pair[];
  /** Dirección de imagen lista para usar en <img src>. */
  img: (key: string) => string;
  /** Valores que el administrador cambió (para el editor). */
  overrides: Record<string, Value>;
  reload: () => Promise<void>;
}

const ContentContext = createContext<ContentApi | null>(null);

const readCache = (): Record<string, Value> => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
};

export function ContentProvider({ children }: { children: ReactNode }) {
  // Se arranca con lo último que se vio para que no parpadee el texto original antes de que llegue lo nuevo.
  const [overrides, setOverrides] = useState<Record<string, Value>>(readCache);

  const reload = useCallback(async () => {
    try {
      const res = await apiFetch("/api/content");
      if (!res.ok) return;
      const data = await res.json();
      setOverrides(data);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
    } catch {}
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const api = useMemo<ContentApi>(() => {
    const get = (key: string): Value | undefined => {
      const v = overrides[key];
      // Un campo de texto guardado vacío vuelve al original solo si el original no puede estar vacío a propósito.
      return v !== undefined ? v : DEFAULTS[key];
    };
    return {
      t: (key) => { const v = get(key); return typeof v === "string" ? v : ""; },
      list: (key) => { const v = get(key); return Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : []; },
      pairs: (key) => { const v = get(key); return Array.isArray(v) ? (v as unknown[]).filter((x): x is Pair => !!x && typeof x === "object" && "a" in (x as object)) : []; },
      img: (key) => { const v = get(key); return typeof v === "string" ? mediaUrl(v) : ""; },
      overrides,
      reload,
    };
  }, [overrides, reload]);

  return <ContentContext.Provider value={api}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentApi {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent debe usarse dentro de ContentProvider");
  return ctx;
}

// Texto con *cursiva* y saltos de línea: <Rich text="Hola *mundo*" />. Todo se escribe como texto, nunca como HTML.
export function Rich({ text, em = "italic" }: { text: string; em?: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/\*([^*]+)\*/g).map((part, j) => (j % 2 === 1 ? <span key={j} className={em}>{part}</span> : <Fragment key={j}>{part}</Fragment>))}
        </Fragment>
      ))}
    </>
  );
}
