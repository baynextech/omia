import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
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
  const [selected, setSelected] = useState<string>("");
  const navigate = useNavigate();

  const handleZoneSelect = (name: string) => {
    setSelected(name);
    if (name) navigate(`/directorio?location=${encodeURIComponent(name)}`);
  };

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

    // Stadia Maps dark (gratuito, sin API key para bajo uso)
    L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    ZONES.forEach((zone) => {
      // Glow ring
      L.circleMarker([zone.lat, zone.lng], {
        radius: 20,
        fillColor: "#98A77C",
        color: "#98A77C",
        weight: 1,
        fillOpacity: 0.12,
      }).addTo(map);

      // Inner dot
      const dot = L.circleMarker([zone.lat, zone.lng], {
        radius: 7,
        fillColor: "#98A77C",
        color: "#F4EFE4",
        weight: 1.5,
        fillOpacity: 1,
      }).addTo(map);

      // Label
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background:rgba(18,30,20,0.88);
          border:1px solid rgba(152,167,124,0.45);
          border-radius:4px;padding:3px 9px;
          font-size:11px;font-weight:600;
          color:#E8E0D0;white-space:nowrap;
          font-family:system-ui,sans-serif;
          backdrop-filter:blur(4px);
        ">${zone.name}</div>`,
        iconAnchor: [-6, 6],
      });
      L.marker([zone.lat, zone.lng], { icon, interactive: false }).addTo(map);

      dot.on("click", () => handleZoneSelect(zone.name));
      dot.on("mouseover", () => dot.setRadius(10));
      dot.on("mouseout",  () => dot.setRadius(7));
    });

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Fly to zone when selected from combo
  useEffect(() => {
    if (!selected || !mapInstance.current) return;
    const zone = ZONES.find(z => z.name === selected);
    if (zone) mapInstance.current.flyTo([zone.lat, zone.lng], 15, { duration: 1.2 });
  }, [selected]);

  const filtered = ZONES.filter(z => z.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="bg-[#1C3829]">
      {/* Header + controls */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-3">Mapa de zonas</p>
            <h2 className="text-4xl md:text-5xl font-serif font-light text-[#F4EFE4] leading-tight">
              Encontrá profes<br />
              <span className="italic text-[#C8D8B0]">cerca tuyo</span>
            </h2>
          </div>

          {/* Search bar — Airbnb pill style */}
          <div className="w-full md:w-auto">
            <div className="flex items-stretch bg-white rounded-full shadow-lg overflow-hidden border border-white/10">
              {/* Barrio — texto libre */}
              <div className="flex flex-col justify-center px-5 py-3 min-w-[160px]">
                <span className="text-[10px] font-bold text-[#1C3829] uppercase tracking-wider mb-0.5">Barrio</span>
                <input
                  type="text"
                  placeholder="Buscá un barrio..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="text-sm text-[#2C2C2C] placeholder:text-[#9D9D9D] bg-transparent focus:outline-none w-36"
                />
              </div>

              <div className="w-px bg-[#E0D8CC] my-3" />

              {/* Zona — combo */}
              <div className="flex flex-col justify-center px-5 py-3 relative min-w-[160px]">
                <span className="text-[10px] font-bold text-[#1C3829] uppercase tracking-wider mb-0.5">Zona</span>
                <select
                  value={selected}
                  onChange={e => handleZoneSelect(e.target.value)}
                  className="appearance-none text-sm text-[#2C2C2C] bg-transparent focus:outline-none cursor-pointer pr-5 w-36"
                >
                  <option value="">Elegí un barrio</option>
                  {filtered.map(z => (
                    <option key={z.name} value={z.name}>{z.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9D9D9D] pointer-events-none" />
              </div>

              {/* Botón buscar */}
              <div className="flex items-center pr-2">
                <button
                  onClick={() => selected && navigate(`/directorio?location=${encodeURIComponent(selected)}`)}
                  className="bg-[#1C3829] hover:bg-[#152e1f] active:scale-95 text-white w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mapa full width */}
      <div style={{ height: 520 }} className="w-full">
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      </div>

      {/* Chips de zonas debajo — horizontal scroll */}
      <div className="max-w-7xl mx-auto px-6 py-5 overflow-x-auto">
        <div className="flex gap-2 pb-1">
          {ZONES.map(zone => (
            <button
              key={zone.name}
              onClick={() => handleZoneSelect(zone.name)}
              className={`shrink-0 px-4 py-2 rounded-sm text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                selected === zone.name
                  ? "bg-[#98A77C] text-white border-[#98A77C]"
                  : "bg-[#243d2d] border-[#3a6048]/50 text-[#9DB085] hover:border-[#98A77C] hover:bg-[#2a4d38]"
              }`}
            >
              {zone.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
