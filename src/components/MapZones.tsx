import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ZONES = [
  "Palermo", "Belgrano", "Recoleta", "Villa Crespo", "Caballito",
  "Almagro", "San Telmo", "Colegiales", "Núñez", "Flores",
  "Villa Urquiza", "Devoto", "Balvanera", "Puerto Madero",
];

const DISCIPLINES = ["Yoga", "Pilates", "Institutos"];

export function MapZones() {
  const [discipline, setDiscipline] = useState("");
  const [zone, setZone] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (zone) params.set("location", zone);
    if (discipline) params.set("discipline", discipline);
    navigate(`/directorio?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden" style={{ height: 600 }}>
      <img
        src="https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1800&q=85&auto=format&fit=crop"
        alt="Pilates class"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1f14]/60 via-[#1C3829]/40 to-[#0d1f14]/80" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        <p className="text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-4">Encontrá tu zona</p>
        <h2 className="text-4xl md:text-6xl font-serif font-light text-white text-center leading-tight mb-10">
          Profesores <span className="italic text-[#C8D8B0]">cerca tuyo</span>
        </h2>

        {/* Barra estilo Airbnb */}
        <div className="w-full max-w-2xl">
          <div className="flex items-stretch bg-white rounded-full shadow-2xl overflow-hidden">

            {/* Disciplina */}
            <div className="flex items-center gap-2 px-5 py-4 flex-1 relative">
              <div className="flex flex-col w-full">
                <span className="text-[10px] font-bold text-[#1C3829] uppercase tracking-wider">Buscás</span>
                <select
                  value={discipline}
                  onChange={e => setDiscipline(e.target.value)}
                  className="appearance-none text-sm text-[#2C2C2C] bg-transparent focus:outline-none cursor-pointer pr-4 w-full"
                >
                  <option value="">Yoga, Pilates o Institutos</option>
                  {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#AFAFAF] shrink-0 pointer-events-none" />
            </div>

            <div className="w-px bg-[#E8E0D0] my-3 shrink-0" />

            {/* Zona */}
            <div className="flex items-center gap-2 px-5 py-4 relative min-w-[160px]">
              <div className="flex flex-col w-full">
                <span className="text-[10px] font-bold text-[#1C3829] uppercase tracking-wider">Zona</span>
                <select
                  value={zone}
                  onChange={e => setZone(e.target.value)}
                  className="appearance-none text-sm text-[#2C2C2C] bg-transparent focus:outline-none cursor-pointer pr-4 w-full"
                >
                  <option value="">Elegí un barrio</option>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
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
      </div>
    </section>
  );
}
