import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { Home } from "./pages/Home";
import { Directory } from "./pages/Directory";
import { Studios } from "./pages/Studios";
import { ForTeachers } from "./pages/ForTeachers";
import { Favorites } from "./pages/Favorites";
import { UserProfile } from "./pages/UserProfile";
import { TeacherProfile } from "./pages/TeacherProfile";
import { CheckoutSimulator } from "./pages/CheckoutSimulator";
import { Shop } from "./pages/Shop";
import { Ranking } from "./pages/Ranking";
import { AdminPanel } from "./pages/AdminPanel";
import { AuthProvider } from "./contexts/AuthContext";
import { ContentProvider } from "./contexts/ContentContext";
import { Terms, Privacy, About, Contact, Regret, NotFound } from "./pages/Legal";
import { News, Article } from "./pages/News";

export default function App() {
  return (
    <AuthProvider>
      <ContentProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<Home />} />
            <Route path="directorio" element={<Directory />} />
            <Route path="estudios" element={<Studios />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="para-profes" element={<ForTeachers />} />
            <Route path="favoritos" element={<Favorites />} />
            <Route path="perfil" element={<UserProfile />} />
            <Route path="profesor/:id" element={<TeacherProfile />} />
            <Route path="tienda" element={<Shop />} />
            <Route path="shop" element={<Shop />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="noticias" element={<News />} />
            <Route path="noticias/:slug" element={<Article />} />
            <Route path="terminos" element={<Terms />} />
            <Route path="privacidad" element={<Privacy />} />
            <Route path="nosotros" element={<About />} />
            <Route path="contacto" element={<Contact />} />
            <Route path="arrepentimiento" element={<Regret />} />
            <Route path="login" element={<Navigate to="/?auth=login" replace />} />
            <Route path="registro" element={<Navigate to="/?auth=register" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          {/* El simulador de pago solo existe en desarrollo */}
          {import.meta.env.DEV && <Route path="checkout-simulator" element={<CheckoutSimulator />} />}
        </Routes>
      </BrowserRouter>
      </ContentProvider>
    </AuthProvider>
  );
}
