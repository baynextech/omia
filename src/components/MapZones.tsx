import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const ZONES = [
  { name: "Palermo",       lat: -34.5814, lng: -58.4275 },
  { name: "Belgrano",      lat: -34.5603, lng: -58.4546 },
  { name: "Recoleta",      lat: -34.5876, lng: -58.3950 },
  { name: "Villa Crespo",  lat: -34.5989, lng: -58.4430 },
  { name: "Caballito",     lat: -34.6172, lng: -58.4424 },
  { name: "Almagro",       lat: -34.6075, lng: -58.4165 },
  { name: "San Telmo",     lat: -34.6217, lng: -58.3726 },
  { name: "Colegiales",    lat: -34.5726, lng: -58.4446 },
  { name: "Núñez",         lat: -34.5471, lng: -58.4601 },
  { name: "Flores",        lat: -34.6288, lng: -58.4632 },
  { name: "Villa Urquiza", lat: -34.5714, lng: -58.4890 },
  { name: "Devoto",        lat: -34.5965, lng: -58.5101 },
  { name: "Balvanera",     lat: -34.6108, lng: -58.4026 },
  { name: "Puerto Madero", lat: -34.6128, lng: -58.3664 },
];

export function MapZones() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  const filtered = ZONES.filter(z => z.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [-34.5975, -58.4457],
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    });
    mapInstance.current = map;

    // Dark Matter tiles — el look oscuro/tech
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    ZONES.forEach((zone) => {
      // Outer glow ring
      L.circleMarker([zone.lat, zone.lng], {
        radius: 22,
        fillColor: "#98A77C",
        color: "#98A77C",
        weight: 1,
        fillOpacity: 0.15,
        className: "zone-glow",
      }).addTo(map);

      // Inner dot
      const dot = L.circleMarker([zone.lat, zone.lng], {
        radius: 8,
        fillColor: "#98A77C",
        color: "#F4EFE4",
        weight: 1.5,
        fillOpacity: 1,
      }).addTo(map);

      // Label
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background:rgba(18,24,18,0.85);
          border:1px solid rgba(152,167,124,0.5);
          border-radius:20px;padding:3px 10px;
          font-size:11px;font-weight:600;
          color:#E8E0D0;white-space:nowrap;
          box-shadow:0 0 12px rgba(152,167,124,0.3);
          font-family:system-ui,sans-serif;
          backdrop-filter:blur(4px);
        ">${zone.name}</div>`,
        iconAnchor: [-4, 6],
      });
      L.marker([zone.lat, zone.lng], { icon, interactive: false }).addTo(map);

      dot.on("click", () => { setSelected(zone.name); navigate(`/directorio?location=${encodeURIComponent(zone.name)}`); });
      dot.on("mouseover", () => { dot.setStyle({ fillColor: "#F4EFE4", radius: 11 } as any); dot.setRadius(11); });
      dot.on("mouseout",  () => { dot.setStyle({ fillColor: "#98A77C", radius: 8  } as any); dot.setRadius(8); });
    });

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  return (
    <section className="relative bg-[#1C3829] py-20 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-3">Mapa de zonas</p>
            <h2 className="text-4xl md:text-5xl font-serif font-light text-[#F4EFE4] mb-3 leading-tight">
              Encontrá profes<br />
              <span className="italic text-[#C8D8B0]">cerca tuyo</span>
            </h2>
            <p className="text-[#9DB085] text-sm leading-relaxed">Hacé click en un barrio para ver los instructores disponibles.</p>
          </div>

          {/* Search bar dark */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A77C]" />
            <input
              type="text"
              placeholder="Buscá un barrio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#243d2d] border border-[#3a6048]/60 rounded-sm pl-11 pr-10 py-3 text-sm text-[#F4EFE4] placeholder:text-[#9DB085]/60 focus:outline-none focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C]/30"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-[#98A77C]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Zona chips */}
          <div className="lg:w-52 shrink-0">
            <div className="flex flex-wrap lg:flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map(zone => (
                <button
                  key={zone.name}
                  onClick={() => { setSelected(zone.name); navigate(`/directorio?location=${encodeURIComponent(zone.name)}`); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-sm text-xs font-semibold border transition-all cursor-pointer text-left w-full ${
                    selected === zone.name
                      ? "bg-[#98A77C] text-white border-[#98A77C]"
                      : "bg-[#243d2d] border-[#3a6048]/50 text-[#9DB085] hover:border-[#98A77C] hover:bg-[#2a4d38]"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-sm bg-[#98A77C] shrink-0" />
                  {zone.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mapa */}
          <div
            className="flex-1 rounded-sm overflow-hidden border border-[#3a6048]/50"
            style={{ height: 480 }}
          >
            <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
