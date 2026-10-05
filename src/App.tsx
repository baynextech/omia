import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <AuthProvider>
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
          </Route>
          {/* El simulador de pago solo existe en desarrollo */}
          {import.meta.env.DEV && <Route path="checkout-simulator" element={<CheckoutSimulator />} />}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
