import { useState, useEffect } from "react";
import { MapPin, Search, Wind, DollarSign, Calendar, Sparkles, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import { TeacherCard, Teacher } from "../components/TeacherCard";
import { motion, AnimatePresence } from "motion/react";
import { SEOMeta } from "../components/SEOMeta";

export function Directory() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [disciplineFilter, setDisciplineFilter] = useState("Todas");
  const [locationFilter, setLocationFilter] = useState("Todos");
  const [specialtyFilter, setSpecialtyFilter] = useState("Todas");
  const [priceFilter, setPriceFilter] = useState("Todos los precios");
  const [availabilityFilter, setAvailabilityFilter] = useState("Cualquier día");
  
  const [smartQuery, setSmartQuery] = useState("");
  const [isSmartSearching, setIsSmartSearching] = useState(false);

  const disciplines = ["Todas", "Yoga", "Pilates"];
  const locations = ["Todos", "San Telmo", "Palermo", "Belgrano", "Recoleta"];
  const specialties = [
    "Todas", 
    "Vinyasa", 
    "Ashtanga", 
    "Yin", 
    "Restaurativo", 
    "Hatha",
    "Pilates Reformer",
    "Pilates Mat",
    "Barre",
    "Postural"
  ];
  const priceRanges = ["Todos los precios", "Menos de $5.000", "$5.000 - $10.000", "Más de $10.000"];
  const availabilities = ["Cualquier día", "Días de semana", "Fin de semana"];

  useEffect(() => {
    // Si hay un query inteligente, no hacemos fetch usando dropdowns a menos que se borre el query
    if (smartQuery !== "") return;
    
    apiFetch(`/api/teachers?discipline=${encodeURIComponent(disciplineFilter)}&location=${encodeURIComponent(locationFilter)}&specialty=${encodeURIComponent(specialtyFilter)}&priceRange=${encodeURIComponent(priceFilter)}&availability=${encodeURIComponent(availabilityFilter)}`)
      .then(res => res.json())
      .then(data => setTeachers(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [disciplineFilter, locationFilter, specialtyFilter, priceFilter, availabilityFilter, smartQuery]);

  const handleSmartSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!smartQuery.trim()) {
      setSmartQuery(""); // Para forzar el useEffect normal
      return;
    }
    
    setIsSmartSearching(true);
    try {
      const response = await apiFetch("/api/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: smartQuery })
      });
      const data = await response.json();
      setTeachers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Smart search error", err);
    } finally {
      setIsSmartSearching(false);
    }
  };

  return (
    <div className="py-12 px-6 max-w-7xl mx-auto">
      <SEOMeta 
        title="Directorio de Profesores de Yoga y Pilates | Omia"
        description="Buscá y filtrá entre los mejores instructores de Yoga y Pilates (Reformer, Mat, Barre) en Buenos Aires. Filtrá por barrio, disciplina, precios y horarios."
        keywords="directorio profesores yoga, instructores de pilates, pilates reformer, pilates mat, yoga buenos aires, profesores ashtanga, pilates postural"
      />
      <div className="mb-12">
        <h1 className="text-4xl font-light tracking-tight mb-4 text-[#2C2C2C]">
          Directorio de Profesionales e Instructores
        </h1>
        <p className="text-[#5D5D5D] max-w-2xl text-lg">
          Encontrá a los mejores instructores de <strong className="text-[#2C2C2C] font-medium">Yoga & Pilates</strong> en tu ciudad. Filtrá por disciplina, zona o usá nuestra búsqueda inteligente por IA.
        </p>
      </div>

      <div className="flex flex-col gap-6 mb-8">
        <form onSubmit={handleSmartSearch} className="relative flex-grow">
          <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#98A77C]" />
          <input 
            type="text"
            placeholder="Preguntale a la IA (ej. 'busco clases de Pilates Reformer en Recoleta' o 'Yoga suave')"
            value={smartQuery}
            onChange={(e) => setSmartQuery(e.target.value)}
            className="w-full bg-[#F4EFE4] border-2 border-[#E8E0D0] rounded-sm pl-14 pr-32 py-5 outline-none focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] transition-all text-lg shadow-sm"
          />
          <button 
            type="submit" 
            disabled={isSmartSearching}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#98A77C] hover:bg-[#88976C] text-white px-6 py-3 rounded-sm font-medium transition-colors flex items-center gap-2"
          >
            {isSmartSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Buscar"}
          </button>
        </form>

        <div className="flex flex-col md:flex-row flex-wrap gap-4">
          {/* Discipline Selector */}
          <div className="relative w-full md:w-48 shrink-0">
            <select 
              value={disciplineFilter}
              onChange={(e) => { setDisciplineFilter(e.target.value); setSmartQuery(""); }}
              className="w-full appearance-none bg-[#2C2C2C] text-white border border-[#2C2C2C] rounded-sm px-6 py-4 font-semibold focus:outline-none cursor-pointer shadow-sm"
            >
              {disciplines.map(disc => (
                <option key={disc} value={disc} className="bg-white text-[#2C2C2C]">{disc === "Todas" ? "Todas las disciplinas" : disc}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="7" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div className="relative w-full md:w-48 shrink-0">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
            <select 
              value={locationFilter}
              onChange={(e) => { setLocationFilter(e.target.value); setSmartQuery(""); }}
              className="w-full appearance-none bg-[#F4EFE4] border border-[#E8E0D0] rounded-sm pl-12 pr-10 py-4 font-medium focus:outline-none focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] cursor-pointer"
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
          <div className="relative w-full md:w-56 shrink-0">
            <Wind className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
            <select 
              value={specialtyFilter}
              onChange={(e) => { setSpecialtyFilter(e.target.value); setSmartQuery(""); }}
              className="w-full appearance-none bg-[#F4EFE4] border border-[#E8E0D0] rounded-sm pl-12 pr-10 py-4 font-medium focus:outline-none focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] cursor-pointer"
            >
              {specialties.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="7" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="relative w-full md:w-56 shrink-0">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
            <select 
              value={priceFilter}
              onChange={(e) => { setPriceFilter(e.target.value); setSmartQuery(""); }}
              className="w-full appearance-none bg-[#F4EFE4] border border-[#E8E0D0] rounded-sm pl-12 pr-10 py-4 font-medium focus:outline-none focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] cursor-pointer"
            >
              {priceRanges.map(price => (
                <option key={price} value={price}>{price}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="7" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="relative w-full md:w-56 shrink-0">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
            <select 
              value={availabilityFilter}
              onChange={(e) => { setAvailabilityFilter(e.target.value); setSmartQuery(""); }}
              className="w-full appearance-none bg-[#F4EFE4] border border-[#E8E0D0] rounded-sm pl-12 pr-10 py-4 font-medium focus:outline-none focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] cursor-pointer"
            >
              {availabilities.map(avail => (
                <option key={avail} value={avail}>{avail}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="7" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {teachers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {teachers.map(teacher => (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <TeacherCard teacher={teacher} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-32 text-center bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0]">
          <p className="text-[#5D5D5D] text-lg">No encontramos profes con esos filtros.</p>
        </div>
      )}
    </div>
  );
}
