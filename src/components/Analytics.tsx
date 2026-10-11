import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useContent } from "../contexts/ContentContext";

const KEY = "omia_cookies";
type Choice = "accepted" | "rejected" | null;

const read = (): Choice => {
  try { return (localStorage.getItem(KEY) as Choice) || null; } catch { return null; }
};

function loadScript(src: string, id: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

// Carga Google Analytics y Meta Pixel solo si el visitante aceptó las cookies y los IDs están configurados.
function startTracking(gaId: string, metaPixelId: string) {
  const w = window as any;
  if (gaId && !w.gtag) {
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag("js", new Date());
    w.gtag("config", gaId, { send_page_view: false });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`, "ga-script");
  }
  if (metaPixelId && !w.fbq) {
    const fbq: any = function (...args: unknown[]) { (fbq.queue = fbq.queue || []).push(args); };
    fbq.queue = [];
    w.fbq = fbq;
    loadScript("https://connect.facebook.net/en_US/fbevents.js", "fb-pixel");
    w.fbq("init", metaPixelId);
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  const w = window as any;
  if (read() !== "accepted") return;
  w.gtag?.("event", name, params);
  w.fbq?.("trackCustom", name, params);
}

export function Analytics() {
  const [choice, setChoice] = useState<Choice>(read);
  const { pathname } = useLocation();
  const { t } = useContent();
  const gaId = t("analytics.ga_id").trim();
  const metaPixelId = t("analytics.meta_pixel").trim();
  const tracked = !!(gaId || metaPixelId);

  useEffect(() => { if (choice === "accepted") startTracking(gaId, metaPixelId); }, [choice, gaId, metaPixelId]);

  // Una vista de página por cada cambio de ruta (el sitio es de una sola página).
  useEffect(() => {
    if (choice !== "accepted") return;
    const w = window as any;
    w.gtag?.("event", "page_view", { page_path: pathname, page_location: window.location.href });
    w.fbq?.("track", "PageView");
  }, [pathname, choice]);

  const decide = (value: Exclude<Choice, null>) => {
    try { localStorage.setItem(KEY, value); } catch {}
    setChoice(value);
  };

  // Sin herramientas de analítica configuradas no hay nada que consentir.
  if (!tracked || choice) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-[60] bg-white border border-[#E8E0D0] shadow-xl rounded-2xl p-5 text-sm text-[#3d3d3d]">
      <p className="mb-4 leading-relaxed">
        Usamos cookies para medir el uso del sitio y mejorar Omia. Podés aceptarlas o rechazarlas; más info en la{" "}
        <Link to="/privacidad" className="text-[#6f8656] underline">Política de privacidad</Link>.
      </p>
      <div className="flex gap-3">
        <button onClick={() => decide("accepted")} className="flex-1 bg-[#98A77C] hover:bg-[#88976C] text-white py-2.5 rounded-xl font-medium">Aceptar</button>
        <button onClick={() => decide("rejected")} className="flex-1 border border-[#E8E0D0] hover:bg-[#F4EFE4] py-2.5 rounded-xl font-medium">Rechazar</button>
      </div>
    </div>
  );
}
