import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { Search, MapPin, Coffee, Compass, Sparkles, Clock, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SEOMeta } from "../components/SEOMeta";

interface Studio {
  id: string;
  name: string;
  discipline: string;
  location: string;
  address: string;
  phone: string;
  price: string;
  amenities: string[];
  hours: string;
  description: string;
  image: string;
  rating: number;
  reviews: number;
}

export function Studios() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("Todos");
  const [disciplineFilter, setDisciplineFilter] = useState("Todos");

  const locations = ["Todos", "Palermo", "San Telmo", "Belgrano", "Recoleta"];
  const disciplines = ["Todos", "Yoga", "Pilates", "Yoga & Pilates"];

  const [studiosList, setStudiosList] = useState<Studio[]>([]);

  // Los institutos son las fichas de tipo "instituto" cargadas en la plataforma.
  useEffect(() => {
    apiFetch("/api/institutes")
      .then(res => res.json())
      .then(data => setStudiosList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  const filteredStudios = studiosList.filter((studio) => {
    const matchesSearch = studio.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (studio.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === "Todos" || studio.location === locationFilter;
    const matchesDiscipline = disciplineFilter === "Todos" || studio.discipline === disciplineFilter || studio.discipline === "Yoga & Pilates";
    return matchesSearch && matchesLocation && matchesDiscipline;
  });

  return (
    <div className="py-12 px-6 max-w-7xl mx-auto min-h-screen">
      <SEOMeta 
        title="Estudios e Institutos de Yoga y Pilates en Buenos Aires | Omia"
        description="Explorá los mejores estudios, institutos y centros de Yoga y Pilates Reformer en Palermo, Recoleta, Belgrano y San Telmo. Equipados con camas reformer, mats y ambiente consciente."
        keywords="estudios de yoga, institutos de pilates, pilates reformer buenos aires, centros de yoga, escuelas de yoga buenos aires"
      />
      {/* Title block */}
      <div className="mb-12">
        <span className="text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-3 block">Estudios e Institutos Afiliados</span>
        <h1 className="text-4xl font-light tracking-tight text-[#2C2C2C] mb-4">
          Estudios e Institutos de Yoga & Pilates
        </h1>
        <p className="text-[#5D5D5D] max-w-2xl text-lg">
          Descubrí los espacios de práctica más hermosos, cálidos y mejor equipados de Buenos Aires. Espacios verificados con camas Reformer, mats de cortesía y atención personalizada.
        </p>
      </div>

      {/* Filters block */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
          <input 
            type="text"
            placeholder="Buscar estudio por nombre o disciplina (ej. Reformer, Hot Yoga)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F4EFE4] border border-[#E8E0D0] rounded-sm pl-12 pr-6 py-4 outline-none focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] transition-all text-[#2C2C2C] shadow-sm"
          />
        </div>

        {/* Discipline Selector */}
        <div className="relative w-full md:w-56 shrink-0">
          <select 
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            className="w-full appearance-none bg-[#2C2C2C] text-white border border-[#2C2C2C] rounded-sm px-6 py-4 font-semibold focus:outline-none cursor-pointer shadow-sm"
          >
            {disciplines.map(disc => (
              <option key={disc} value={disc} className="bg-white text-[#2C2C2C]">
                {disc === "Todos" ? "Todas las disciplinas" : disc}
              </option>
            ))}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="12" height="7" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="relative w-full md:w-56 shrink-0">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
          <select 
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full appearance-none bg-[#F4EFE4] border border-[#E8E0D0] rounded-sm pl-12 pr-10 py-4 font-medium focus:outline-none focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] cursor-pointer text-[#2C2C2C] shadow-sm"
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="12" height="7" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Studios Grid */}
      <AnimatePresence mode="popLayout">
        {filteredStudios.length > 0 ? (
          <motion.div 
            layout 
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {filteredStudios.map((studio) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                key={studio.id}
                className="bg-white border border-[#E8E0D0] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
              >
                {/* Image & location tag */}
                <div className="relative h-60 w-full overflow-hidden shrink-0">
                  <img 
                    src={studio.image} 
                    alt={studio.name} 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-[#2C2C2C] px-3.5 py-1 rounded-sm text-xs font-semibold shadow-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#98A77C]" />
                    <span>{studio.location}</span>
                  </div>
                </div>

                {/* Content body */}
                <div className="p-8 flex flex-col justify-between flex-grow">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h3 className="text-2xl font-semibold text-[#2C2C2C] tracking-tight">{studio.name}</h3>
                      <span className="text-xs bg-[#98A77C]/10 text-[#98A77C] font-bold px-3 py-1 rounded-sm tracking-wider uppercase whitespace-nowrap">Verificado</span>
                    </div>

                    <p className="text-xs text-[#5D5D5D] font-mono mb-4 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      <span>{studio.address || studio.location}</span>
                      {studio.reviews > 0 && <span>· ★ {studio.rating} ({studio.reviews} {studio.reviews === 1 ? "reseña" : "reseñas"})</span>}
                    </p>

                    <p className="text-[#5D5D5D] text-sm leading-relaxed mb-6">
                      {studio.description}
                    </p>

                    {/* Amenities list */}
                    <div className="mb-6">
                      <p className="text-xs font-bold text-[#2C2C2C] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#98A77C]" />
                        Comodidades del espacio:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(studio.amenities || []).map((amenity, idx) => (
                          <span key={idx} className="bg-[#F4EFE4] border border-[#E8E0D0] text-[#5D5D5D] text-xs px-3 py-1 rounded-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#98A77C]" />
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="pt-6 border-t border-[#E8E0D0] flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#5D5D5D] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {studio.hours}
                      </span>
                      <strong className="text-[#2C2C2C] font-semibold">{studio.price}</strong>
                    </div>
                    
                    <div className="flex gap-4 mt-2">
                      <a 
                        href={`tel:${studio.phone}`}
                        className="flex-1 text-center bg-[#F4EFE4] border border-[#E8E0D0] hover:border-[#2C2C2C] text-[#2C2C2C] py-3 rounded-sm text-sm font-medium transition-colors"
                      >
                        Llamar
                      </a>
                      <Link
                        to={`/profesor/${studio.id}`}
                        className="flex-1 text-center bg-[#2C2C2C] hover:bg-black text-white py-3 rounded-sm text-sm font-medium transition-colors"
                      >
                        Ver perfil y reseñas
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0] py-20 px-6 text-center max-w-2xl mx-auto flex flex-col items-center">
            <Compass className="w-12 h-12 text-[#E5E5E5] mb-4" />
            <h2 className="text-xl font-medium text-[#2C2C2C] mb-2">No se encontraron centros</h2>
            <p className="text-[#5D5D5D] max-w-md mx-auto">Probá cambiando la zona o escribiendo otro término de búsqueda.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
