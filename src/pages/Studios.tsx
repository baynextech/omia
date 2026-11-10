import { useContent } from "../contexts/ContentContext";
import { Photo } from "../components/Photo";
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
  const { t, img } = useContent();
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
    <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto min-h-screen">
      <SEOMeta title={t("seo.studios.title")} description={t("seo.studios.description")} ogImage={img("seo.image")} keywords="estudios de yoga, institutos de pilates, pilates reformer buenos aires, centros de yoga, escuelas de yoga buenos aires" />
      {/* Title block */}
      <div className="mb-12">
        <span className="text-xs font-bold tracking-widest text-salvia-oscuro uppercase mb-3 block">{t("studios.eyebrow")}</span>
        <h1 className="font-serif text-4xl font-light tracking-tight text-bosque mb-4">
          {t("studios.title")}
        </h1>
        <p className="text-musgo max-w-2xl text-lg">
          {t("studios.subtitle")}
        </p>
      </div>

      {/* Filters block */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-musgo" />
          <input 
            type="text"
            placeholder="Buscar estudio por nombre o disciplina (ej. Reformer, Hot Yoga)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-lino border border-lino-oscuro rounded-sm pl-12 pr-6 py-4 outline-none focus:border-salvia focus:ring-1 focus:ring-salvia transition-all text-bosque shadow-sm"
          />
        </div>

        {/* Discipline Selector */}
        <div className="relative w-full md:w-56 shrink-0">
          <select 
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            className="w-full appearance-none bg-bosque text-lino border border-bosque rounded-sm px-6 py-4 font-semibold focus:outline-none cursor-pointer shadow-sm"
          >
            {disciplines.map(disc => (
              <option key={disc} value={disc} className="bg-white text-bosque">
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
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-musgo" />
          <select 
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full appearance-none bg-lino border border-lino-oscuro rounded-sm pl-12 pr-10 py-4 font-medium focus:outline-none focus:border-salvia focus:ring-1 focus:ring-salvia cursor-pointer text-bosque shadow-sm"
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="12" height="7" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#1C3829" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                className="bg-white border border-lino-oscuro rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
              >
                {/* Image & location tag */}
                <div className="relative h-60 w-full overflow-hidden shrink-0">
                  <Photo
                    src={studio.image}
                    name={studio.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-bosque px-3.5 py-1 rounded-sm text-xs font-semibold shadow-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-salvia-oscuro" />
                    <span>{studio.location}</span>
                  </div>
                </div>

                {/* Content body */}
                <div className="p-8 flex flex-col justify-between flex-grow">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h3 className="text-2xl font-semibold text-bosque tracking-tight">{studio.name}</h3>
                      <span className="text-xs bg-salvia/10 text-salvia-oscuro font-bold px-3 py-1 rounded-sm tracking-wider uppercase whitespace-nowrap">Verificado</span>
                    </div>

                    <p className="text-xs text-musgo font-mono mb-4 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      <span>{studio.address || studio.location}</span>
                      {studio.reviews > 0 && <span>· ★ {studio.rating} ({studio.reviews} {studio.reviews === 1 ? "reseña" : "reseñas"})</span>}
                    </p>

                    <p className="text-musgo text-sm leading-relaxed mb-6">
                      {studio.description}
                    </p>

                    {/* Amenities list */}
                    <div className="mb-6">
                      <p className="text-xs font-bold text-bosque uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-salvia-oscuro" />
                        Comodidades del espacio:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(studio.amenities || []).map((amenity, idx) => (
                          <span key={idx} className="bg-lino border border-lino-oscuro text-musgo text-xs px-3 py-1 rounded-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-salvia-oscuro" />
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="pt-6 border-t border-lino-oscuro flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-musgo flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {studio.hours}
                      </span>
                      <strong className="text-bosque font-semibold">{studio.price}</strong>
                    </div>
                    
                    <div className="flex gap-4 mt-2">
                      <a 
                        href={`tel:${studio.phone}`}
                        className="flex-1 text-center bg-lino border border-lino-oscuro hover:border-bosque text-bosque py-3 rounded-full text-sm font-medium transition-colors"
                      >
                        Llamar
                      </a>
                      <Link
                        to={`/profesor/${studio.id}`}
                        className="flex-1 text-center bg-bosque hover:bg-bosque-profundo text-lino py-3 rounded-full text-sm font-medium transition-colors"
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
          <div className="bg-lino rounded-3xl border border-lino-oscuro py-20 px-6 text-center max-w-2xl mx-auto flex flex-col items-center">
            <Compass className="w-12 h-12 text-lino-oscuro mb-4" />
            <h2 className="text-xl font-medium text-bosque mb-2">No se encontraron centros</h2>
            <p className="text-musgo max-w-md mx-auto">Probá cambiando la zona o escribiendo otro término de búsqueda.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
