import { useState } from "react";
import { Search, ChevronDown, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ZONES = [
  "Palermo", "Belgrano", "Recoleta", "Villa Crespo", "Caballito",
  "Almagro", "San Telmo", "Colegiales", "Núñez", "Flores",
  "Villa Urquiza", "Devoto", "Balvanera", "Puerto Madero",
];

export function MapZones() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    const target = selected || search.trim();
    if (target) navigate(`/directorio?location=${encodeURIComponent(target)}`);
    else navigate("/directorio");
  };

  const filtered = ZONES.filter(z => z.toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="relative overflow-hidden" style={{ height: 600 }}>
      {/* Imagen de fondo hyperrealista */}
      <img
        src="https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1800&q=85&auto=format&fit=crop"
        alt="Pilates class"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      {/* Overlay oscuro para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1f14]/60 via-[#1C3829]/40 to-[#0d1f14]/80" />

      {/* Contenido centrado */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        <p className="text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-4">Encontrá tu zona</p>
        <h2 className="text-4xl md:text-6xl font-serif font-light text-white text-center leading-tight mb-10">
          Profesores <span className="italic text-[#C8D8B0]">cerca tuyo</span>
        </h2>

        {/* Barra estilo Airbnb */}
        <div className="w-full max-w-2xl">
          <div className="flex items-stretch bg-white rounded-full shadow-2xl overflow-hidden">
            {/* Barrio */}
            <div className="flex items-center gap-3 px-5 py-4 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-[#98A77C] shrink-0" />
              <div className="flex flex-col min-w-0 w-full">
                <span className="text-[10px] font-bold text-[#1C3829] uppercase tracking-wider">Barrio</span>
                <input
                  type="text"
                  placeholder="¿Dónde buscás?"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="text-sm text-[#2C2C2C] placeholder:text-[#AFAFAF] bg-transparent focus:outline-none w-full"
                />
              </div>
            </div>

            <div className="w-px bg-[#E8E0D0] my-3 shrink-0" />

            {/* Zona combo */}
            <div className="flex items-center gap-2 px-5 py-4 relative min-w-[170px]">
              <div className="flex flex-col w-full">
                <span className="text-[10px] font-bold text-[#1C3829] uppercase tracking-wider">Zona</span>
                <select
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  className="appearance-none text-sm text-[#2C2C2C] bg-transparent focus:outline-none cursor-pointer pr-4 w-full"
                >
                  <option value="">Elegí un barrio</option>
                  {filtered.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#AFAFAF] shrink-0 pointer-events-none" />
            </div>

            {/* Botón */}
            <div className="flex items-center p-2 shrink-0">
              <button
                onClick={handleSearch}
                className="bg-[#1C3829] hover:bg-[#152e1f] active:scale-95 text-white w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chips */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-3xl">
          {ZONES.map(zone => (
            <button
              key={zone}
              onClick={() => { setSelected(zone); navigate(`/directorio?location=${encodeURIComponent(zone)}`); }}
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-[#98A77C] hover:border-[#98A77C] transition-all backdrop-blur-sm whitespace-nowrap"
            >
              {zone}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
