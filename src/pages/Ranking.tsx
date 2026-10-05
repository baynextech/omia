import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, Trophy } from "lucide-react";
import { apiFetch } from "../lib/api";
import { SEOMeta } from "../components/SEOMeta";
import { Teacher } from "../components/TeacherCard";

type RankedTeacher = Teacher & { position: number; score: number; kind: string };

const KINDS = [
  { id: "", label: "Todos" },
  { id: "profesor", label: "Profesores" },
  { id: "instituto", label: "Institutos" },
];
const DISCIPLINES = ["Todas", "Yoga", "Pilates"];

export function Ranking() {
  const [ranking, setRanking] = useState<RankedTeacher[]>([]);
  const [kind, setKind] = useState("");
  const [discipline, setDiscipline] = useState("Todas");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiFetch(`/api/ranking?kind=${kind}&discipline=${encodeURIComponent(discipline)}&limit=30`)
      .then(res => res.json())
      .then(data => setRanking(Array.isArray(data) ? data : []))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [kind, discipline]);

  const chip = (active: boolean) =>
    `px-4 py-2 rounded-sm text-sm font-medium border transition-colors ${
      active ? "bg-[#1C3829] text-white border-[#1C3829]" : "bg-white text-[#5D5D5D] border-[#E8E0D0] hover:border-[#98A77C]"
    }`;

  return (
    <div className="pt-28 pb-16 px-6 max-w-4xl mx-auto min-h-screen">
      <SEOMeta
        title="Ranking de Profesores e Institutos de Yoga y Pilates | Omia"
        description="Los profesores e institutos de Yoga y Pilates mejor puntuados por sus alumnos en Omia. Leé las reseñas y dejá la tuya."
        keywords="mejores profesores de yoga, mejores institutos de pilates, ranking yoga buenos aires, reseñas profesores pilates"
      />

      <div className="text-center mb-10">
        <Trophy className="w-10 h-10 text-[#98A77C] mx-auto mb-4" />
        <h1 className="text-4xl font-light tracking-tight text-[#2C2C2C] mb-3">Ranking de profesionales</h1>
        <p className="text-[#5D5D5D] max-w-xl mx-auto">
          Los mejor puntuados por quienes tomaron sus clases. El orden combina el puntaje con la cantidad de reseñas.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-3">
        {KINDS.map(k => (
          <button key={k.id} onClick={() => setKind(k.id)} className={chip(kind === k.id)}>{k.label}</button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {DISCIPLINES.map(d => (
          <button key={d} onClick={() => setDiscipline(d)} className={chip(discipline === d)}>{d}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#98A77C]/30 border-t-[#98A77C] rounded-sm animate-spin" />
        </div>
      ) : ranking.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {ranking.map(t => (
            <li key={t.id}>
              <Link
                to={`/profesor/${t.id}`}
                className="flex items-center gap-4 bg-white border border-[#E8E0D0] rounded-2xl p-4 hover:shadow-md hover:border-[#98A77C] transition-all"
              >
                <span className={`w-10 text-center text-2xl font-mono font-bold shrink-0 ${t.position <= 3 ? "text-[#98A77C]" : "text-[#C9C2B2]"}`}>
                  {t.position}
                </span>
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F4EFE4] shrink-0">
                  {t.image && <img src={t.image} alt={t.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-[#2C2C2C] truncate">{t.name}</h2>
                  <p className="text-sm text-[#5D5D5D] truncate">
                    {t.kind === "instituto" ? "Instituto" : t.specialty || t.discipline}
                  </p>
                  <p className="text-xs text-[#5D5D5D] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {t.location}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1">
                    <Star className="w-5 h-5 fill-[#98A77C] text-[#98A77C]" />
                    <span className="text-xl font-semibold text-[#2C2C2C]">{t.rating.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-[#5D5D5D]">{t.reviews} {t.reviews === 1 ? "reseña" : "reseñas"}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0] py-20 px-6 text-center">
          <h2 className="text-xl font-medium text-[#2C2C2C] mb-2">Todavía no hay reseñas para armar el ranking</h2>
          <p className="text-[#5D5D5D] max-w-sm mx-auto mb-6">Entrá al perfil de tu profesor o instituto y dejá la primera.</p>
          <Link to="/directorio" className="inline-block bg-[#2C2C2C] hover:bg-black text-white px-6 py-3 rounded-sm text-sm font-medium transition-colors">
            Ir al directorio
          </Link>
        </div>
      )}
    </div>
  );
}
