import { useContent, Rich } from "../contexts/ContentContext";
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
  const { t } = useContent();
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
    <section className="relative overflow-hidden" style={{ minHeight: 600 }}>
      <img
        src="https://images.unsplash.com/photo-1588286840104-8957b019727f?w=1800&q=90&auto=format&fit=crop&crop=center"
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-bosque-profundo/60 via-bosque/40 to-bosque-profundo/80" />

      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-24" style={{ minHeight: 600 }}>
        <p className="text-xs font-bold tracking-widest text-salvia uppercase mb-4">{t("home.map.eyebrow")}</p>
        <h2 className="text-4xl md:text-6xl font-serif font-light text-white text-center leading-tight mb-10">
          <Rich text={t("home.map.title")} em="text-salvia-claro" />
        </h2>

        {/* Barra estilo Airbnb */}
        <div className="w-full max-w-2xl">
          <form role="search" onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex flex-col sm:flex-row items-stretch bg-white rounded-3xl sm:rounded-full shadow-2xl overflow-hidden">

            {/* Disciplina */}
            <div className="flex items-center gap-2 px-5 py-4 flex-1 relative">
              <label className="flex flex-col w-full">
                <span className="text-xs font-semibold text-bosque">Buscás</span>
                <select
                  value={discipline}
                  onChange={e => setDiscipline(e.target.value)}
                  className="appearance-none text-sm text-bosque bg-transparent cursor-pointer rounded-sm pr-4 w-full"
                >
                  <option value="">Yoga, Pilates o Institutos</option>
                  {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <ChevronDown className="w-3.5 h-3.5 text-musgo shrink-0 pointer-events-none" />
            </div>

            <div className="h-px sm:h-auto sm:w-px bg-lino-oscuro mx-5 sm:mx-0 sm:my-3 shrink-0" />

            {/* Zona */}
            <div className="flex items-center gap-2 px-5 py-4 relative min-w-[160px]">
              <label className="flex flex-col w-full">
                <span className="text-xs font-semibold text-bosque">Zona</span>
                <select
                  value={zone}
                  onChange={e => setZone(e.target.value)}
                  className="appearance-none text-sm text-bosque bg-transparent cursor-pointer rounded-sm pr-4 w-full"
                >
                  <option value="">Elegí un barrio</option>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </label>
              <ChevronDown className="w-3.5 h-3.5 text-musgo shrink-0 pointer-events-none" />
            </div>

            {/* Botón */}
            <div className="flex items-center p-2 shrink-0">
              <button
                                type="submit"
                aria-label="Buscar profesores"
                className="bg-bosque hover:bg-bosque-profundo active:scale-[0.96] text-lino w-full sm:w-12 h-12 rounded-full flex items-center justify-center gap-2 transition text-sm font-semibold"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span className="sm:hidden">Buscar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
