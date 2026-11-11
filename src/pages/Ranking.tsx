import { profileUrl } from "../lib/links";
import { useContent } from "../contexts/ContentContext";
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
  const { t, img } = useContent();
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
      active ? "bg-bosque text-lino border-bosque" : "bg-white text-musgo border-lino-oscuro hover:border-salvia"
    }`;

  return (
    <div className="pt-28 pb-16 px-6 max-w-4xl mx-auto min-h-screen">
      <SEOMeta title={t("seo.ranking.title")} description={t("seo.ranking.description")} ogImage={img("seo.image")} keywords="mejores profesores de yoga, mejores institutos de pilates, ranking yoga buenos aires, reseñas profesores pilates" />

      <div className="text-center mb-10">
        <Trophy className="w-10 h-10 text-salvia mx-auto mb-4" />
        <h1 className="font-serif text-4xl font-light tracking-tight text-bosque mb-3">{t("ranking.title")}</h1>
        <p className="text-musgo max-w-xl mx-auto">
          {t("ranking.subtitle")}
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
          <div className="w-8 h-8 border-4 border-salvia/30 border-t-salvia rounded-sm animate-spin" />
        </div>
      ) : ranking.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {ranking.map(t => (
            <li key={t.id}>
              <Link
                to={profileUrl(t)}
                className="flex items-center gap-4 bg-white border border-lino-oscuro rounded-2xl p-4 hover:shadow-md hover:border-salvia transition-all"
              >
                <span className={`w-10 text-center text-2xl font-mono font-bold shrink-0 ${t.position <= 3 ? "text-salvia-oscuro" : "text-[#C9C2B2]"}`}>
                  {t.position}
                </span>
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-lino shrink-0">
                  {t.image && <img src={t.image} alt={t.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-bosque truncate">{t.name}</h2>
                  <p className="text-sm text-musgo truncate">
                    {t.kind === "instituto" ? "Instituto" : t.specialty || t.discipline}
                  </p>
                  <p className="text-xs text-musgo flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {t.location}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1">
                    <Star className="w-5 h-5 fill-salvia text-salvia" />
                    <span className="text-xl font-semibold text-bosque">{t.rating.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-musgo">{t.reviews} {t.reviews === 1 ? "reseña" : "reseñas"}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="bg-lino rounded-3xl border border-lino-oscuro py-20 px-6 text-center">
          <h2 className="text-xl font-medium text-bosque mb-2">Todavía no hay reseñas para armar el ranking</h2>
          <p className="text-musgo max-w-sm mx-auto mb-6">Entrá al perfil de tu profesor o instituto y dejá la primera.</p>
          <Link to="/directorio" className="inline-block bg-bosque hover:bg-bosque-profundo text-lino px-6 py-3 rounded-full text-sm font-medium transition-colors">
            Ir al directorio
          </Link>
        </div>
      )}
    </div>
  );
}
