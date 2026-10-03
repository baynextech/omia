import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { apiFetch } from "../lib/api";
import { TeacherCard, Teacher } from "../components/TeacherCard";
import { useFavorites } from "../hooks/useFavorites";

export function Favorites() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const { favorites, toggleFavorite } = useFavorites();
  const [teacherToRemove, setTeacherToRemove] = useState<Teacher | null>(null);

  useEffect(() => {
    // Fetch all teachers then filter locally, or we could pass IDs to a specialized endpoint
    apiFetch(`/api/teachers?location=Todos`)
      .then(res => res.json())
      .then((data: Teacher[]) => {
        setTeachers(data.filter(t => favorites.includes(t.id)));
      })
      .catch(err => console.error(err));
  }, [favorites]);

  const handleToggleFavorite = (id: string, isFavorited: boolean) => {
    if (isFavorited) {
      const teacher = teachers.find(t => t.id === id);
      if (teacher) setTeacherToRemove(teacher);
    } else {
      toggleFavorite(id);
    }
  };

  const confirmRemove = () => {
    if (teacherToRemove) {
      toggleFavorite(teacherToRemove.id);
      setTeacherToRemove(null);
    }
  };

  return (
    <div className="py-24 px-6 max-w-7xl mx-auto min-h-[70vh]">
      <div className="mb-12">
        <h1 className="text-4xl font-light tracking-tight mb-4 text-[#2C2C2C] flex items-center gap-3">
          <Heart className="w-8 h-8 fill-[#98A77C] text-[#98A77C]" />
          Mis Profes Favoritos
        </h1>
        <p className="text-[#5D5D5D] max-w-2xl text-lg">
          Acá están los profesionales de yoga que guardaste. Reservá tu próxima sesión rápido y fácil.
        </p>
      </div>

      {teachers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teachers.map(teacher => (
            <TeacherCard key={teacher.id} teacher={teacher} onToggleFavoriteOverride={handleToggleFavorite} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0] flex flex-col items-center justify-center">
          <Heart className="w-12 h-12 text-[#E5E5E5] mb-4" />
          <h2 className="text-xl font-medium text-[#2C2C2C] mb-2">Todavía no tenés favoritos</h2>
          <p className="text-[#5D5D5D] mb-6">Explorá nuestro directorio y guardá a los profes que más te gusten.</p>
          <Link to="/directorio" className="bg-[#98A77C] hover:bg-[#88976C] text-white px-8 py-3 rounded-sm font-medium transition-colors">
            Explorar Directorio
          </Link>
        </div>
      )}

      {teacherToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-12 h-12 bg-[#F4EFE4] text-red-400 rounded-sm flex items-center justify-center mb-4 border border-[#E8E0D0]">
              <Heart className="w-6 h-6 fill-red-400" />
            </div>
            <h2 className="text-2xl font-medium text-[#2C2C2C] mb-2">¿Eliminar favorito?</h2>
            <p className="text-[#5D5D5D] mb-8">
              ¿Estás seguro de que querés sacar a {teacherToRemove.name} de tus favoritos?
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setTeacherToRemove(null)}
                className="flex-1 bg-transparent hover:bg-black/5 text-[#2C2C2C] border border-[#E8E0D0] hover:border-transparent py-3 rounded-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmRemove}
                className="flex-1 bg-white hover:bg-red-50 text-red-500 border border-red-200 hover:border-red-300 py-3 rounded-sm font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
