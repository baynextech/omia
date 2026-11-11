import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Star } from "lucide-react";
import { apiFetch } from "../lib/api";
import { SEOMeta } from "../components/SEOMeta";
import { ProBadge } from "../components/ProBadge";
import { profileUrl } from "../lib/links";

interface Pin {
  id: string; slug?: string | null; name: string; kind: "profesor" | "instituto"; discipline?: string; location?: string; address?: string;
  lat: number; lng: number; rating: number; reviews: number; image: string; isPro: boolean; isFeatured: boolean;
}

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

// Pin dorado y grande para los institutos destacados; pin verde chico para el resto.
const icon = (featured: boolean, kind: string) =>
  L.divIcon({
    className: "",
    iconSize: featured ? [38, 38] : [22, 22],
    iconAnchor: featured ? [19, 19] : [11, 11],
    html: featured
      ? `<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(#F6DC8D,#D8A93B);border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:18px">★</div>`
      : `<div style="width:22px;height:22px;border-radius:50%;background:${kind === "instituto" ? "#1C3829" : "#4E6F5B"};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35)"></div>`,
  });

export function MapPage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [filter, setFilter] = useState<"todos" | "instituto" | "profesor">("todos");
  const [loaded, setLoaded] = useState(false);
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    apiFetch("/api/map").then((r) => r.json()).then((d) => setPins(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const visible = useMemo(() => pins.filter((p) => filter === "todos" || p.kind === filter), [pins, filter]);
  const featured = useMemo(() => pins.filter((p) => p.isFeatured), [pins]);

  useEffect(() => {
    if (!mapEl.current || map.current) return;
    map.current = L.map(mapEl.current, { scrollWheelZoom: false }).setView([-34.595, -58.43], 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    // Los destacados van al final para quedar por encima del resto.
    [...visible].sort((a, b) => Number(a.isFeatured) - Number(b.isFeatured)).forEach((p) => {
      const m = L.marker([p.lat, p.lng], { icon: icon(p.isFeatured, p.kind), zIndexOffset: p.isFeatured ? 1000 : 0, title: p.name });
      m.bindPopup(`<div style="min-width:170px"><strong>${esc(p.name)}</strong><br><span style="font-size:12px">${esc(p.address || p.location || "")}</span>
        ${p.reviews > 0 ? `<br><span style="font-size:12px">★ ${p.rating} (${p.reviews})</span>` : ""}
        ${p.isFeatured ? `<br><span style="font-size:11px;color:#6B4A06;font-weight:700">DESTACADO EN EL MAPA</span>` : ""}
        <br><a href="${profileUrl(p)}" style="font-weight:600">Ver perfil</a></div>`);
      m.addTo(layer.current!);
    });
    if (visible.length) map.current.fitBounds(L.latLngBounds(visible.map((p) => [p.lat, p.lng] as [number, number])).pad(0.15), { maxZoom: 14 });
  }, [visible]);

  const focus = (p: Pin) => {
    map.current?.setView([p.lat, p.lng], 15);
    mapEl.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="py-16 md:py-24 px-6 max-w-7xl mx-auto">
      <SEOMeta title="Mapa de estudios y profesores de yoga y pilates" description="Encontrá estudios, institutos y profesores de yoga y pilates cerca tuyo en el mapa de Buenos Aires." />
      <span className="text-xs font-bold tracking-widest text-salvia-oscuro uppercase mb-3 block">Mapa</span>
      <h1 className="font-serif text-4xl font-light tracking-tight text-bosque mb-3">Estudios y profes en el mapa</h1>
      <p className="text-musgo max-w-2xl mb-8">Tocá un punto para ver la ficha. Los estudios con <strong>Plan Institutos</strong> aparecen destacados con una estrella dorada.</p>

      {featured.length > 0 && (
        <section className="mb-8" aria-label="Destacados en el mapa">
          <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B4A06] mb-3 flex items-center gap-2"><Star className="w-4 h-4 fill-[#D8A93B] text-[#B8892B]" /> Destacados en el mapa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featured.map((p) => (
              <div key={p.id} className="bg-[#FFF9E8] border border-[#E4C56A] rounded-2xl p-4 flex gap-3 items-center">
                {p.image ? <img src={p.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-lino-oscuro shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className="font-semibold text-bosque truncate">{p.name}</p><ProBadge /></div>
                  <p className="text-xs text-musgo truncate flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{p.address || p.location}</p>
                  <div className="flex gap-3 mt-1 text-xs font-semibold">
                    <button onClick={() => focus(p)} className="text-salvia-oscuro hover:underline cursor-pointer">Ver en el mapa</button>
                    <Link to={profileUrl(p)} className="text-bosque hover:underline">Ver perfil</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-2 mb-4" role="group" aria-label="Filtrar el mapa">
        {([["todos", "Todos"], ["instituto", "Estudios e institutos"], ["profesor", "Profesores"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className={`px-4 py-2 rounded-full text-sm font-medium border cursor-pointer transition-colors ${filter === id ? "bg-bosque text-lino border-bosque" : "bg-lino text-musgo border-lino-oscuro hover:border-bosque"}`}>{label}</button>
        ))}
      </div>

      <div ref={mapEl} className="w-full h-[520px] rounded-3xl border border-lino-oscuro overflow-hidden z-0" />
      {loaded && pins.length === 0 && <p className="text-center text-musgo mt-6">Todavía no hay fichas ubicadas en el mapa.</p>}
    </div>
  );
}
