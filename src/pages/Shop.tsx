import { useState } from "react";
import { apiFetch } from "../lib/api";
import { 
  ShoppingBag, Search, Filter, Star, Check, Plus, Minus, X, Trash2, 
  Sparkles, ShieldCheck, Truck, ArrowRight, PhoneCall, CreditCard, Heart, ShoppingCart 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SEOMeta } from "../components/SEOMeta";

export interface Product {
  id: string;
  name: string;
  category: "Mats" | "Accesorios" | "Pilates Equipment" | "Indumentaria" | "Aromaterapia";
  discipline: "Yoga" | "Pilates" | "Yoga & Pilates";
  price: number;
  rating: number;
  reviewsCount: number;
  image: string;
  badge?: string;
  description: string;
  features: string[];
  inStock: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Mat Eco Rubber Align 5mm",
    category: "Mats",
    discipline: "Yoga & Pilates",
    price: 42000,
    rating: 4.9,
    reviewsCount: 88,
    image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&q=80&w=600",
    badge: "Eco Friendly",
    description: "Mat profesional fabricado con caucho natural 100% biodegradable. Líneas de alineación láser para perfeccionar posturas y grip antideslizante máximo.",
    features: ["Caucho natural de 5mm de espesor", "Líneas de alineación central y transversal", "Antideslizante extremo en húmedo y seco", "Libre de PVC y químicos nocivos"],
    inStock: true
  },
  {
    id: "p2",
    name: "Mat Extra Grip Reformer & Mat Pro 15mm",
    category: "Mats",
    discipline: "Pilates",
    price: 48500,
    rating: 5.0,
    reviewsCount: 64,
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=600",
    badge: "Pilates Pro",
    description: "Colchoneta acolchada de alta densidad ideal para Pilates Mat, ejercicios de columna y protección articular. No se deforma con el uso intenso.",
    features: ["15mm de grosor con memoria de amortiguación", "Superficie de textura estriada anti-desplazamiento", "Incluye correa de transporte ajustable", "Resistente al agua y fácil de limpiar"],
    inStock: true
  },
  {
    id: "p3",
    name: "Anillo de Pilates Magic Circle Flex",
    category: "Pilates Equipment",
    discipline: "Pilates",
    price: 18500,
    rating: 4.8,
    reviewsCount: 42,
    image: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=600",
    badge: "Más Vendido",
    description: "Aro flexible de fibra de vidrio recubierta de goma suave con almohadillas anatómicas laterales para entrenamiento de piernas, brazos y core.",
    features: ["Diámetro de 38 cm estándar internacional", "Resistencia progresiva ergonómica", "Acolchado doble antiderrapante interior y exterior", "Ideal para tonificación de aductores y torso"],
    inStock: true
  },
  {
    id: "p4",
    name: "Bloques de Corcho Orgánico (Par)",
    category: "Accesorios",
    discipline: "Yoga & Pilates",
    price: 14200,
    rating: 4.9,
    reviewsCount: 110,
    image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&q=80&w=600",
    badge: "Sostenible",
    description: "Par de bloques rígidos de corcho natural con bordes biselados para firmeza, apoyo y flexibilidad en posturas exigentes.",
    features: ["100% corcho de roble certificado", "Bordes redondeados para un agarre cómodo", "Soporta peso de hasta 180kg sin flexionarse", "Superficie suave y antibacteriana"],
    inStock: true
  },
  {
    id: "p5",
    name: "Medias Antideslizantes Grip Pilates & Barre",
    category: "Indumentaria",
    discipline: "Pilates",
    price: 6500,
    rating: 4.7,
    reviewsCount: 95,
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=600",
    badge: "Recomendado",
    description: "Medias respirables con microgotas de silicona de alta adherencia en la planta para uso en máquinas Reformer, tablas y mat.",
    features: ["Algodón peinado con elastano respirable", "Silicona antiderrapante de alta precisión", "Ajuste perfecto en empeine con arco elástico", "Disponibles en varias tallas (S, M, L)"],
    inStock: true
  },
  {
    id: "p6",
    name: "Cinta Strap de Estiramiento Algodón 2.5m",
    category: "Accesorios",
    discipline: "Yoga & Pilates",
    price: 8900,
    rating: 4.8,
    reviewsCount: 53,
    image: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&q=80&w=600",
    description: "Correa de estiramiento asistido con hebilla metálica de doble argolla en D. Ayuda a profundizar estiramientos de isquiotibiales y hombros.",
    features: ["250 cm de largo x 3.8 cm de ancho", "Hebilla metálica reforzada sin deslizamiento", "Algodón suave para no dañar las manos", "Ideal para flexibilización progresiva"],
    inStock: true
  },
  {
    id: "p7",
    name: "Kit Bandas Elásticas de Resistencia (Set x 3)",
    category: "Pilates Equipment",
    discipline: "Pilates",
    price: 12500,
    rating: 4.9,
    reviewsCount: 76,
    image: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=600",
    badge: "Kit Completo",
    description: "Set de 3 mini bands de látex natural de diferentes intensidades (Suave, Media, Fuerte) para trabajo de glúteos, cadera y estabilidad postural.",
    features: ["Tres niveles de tensión codificados por color", "Látex 100% natural ultra durable", "Incluye bolsita de guardado en red", "Ideales para complementar ejercicios de Pilates Mat"],
    inStock: true
  },
  {
    id: "p8",
    name: "Spray Orgánico Limpia Mat Eucalipto & Lavanda",
    category: "Aromaterapia",
    discipline: "Yoga & Pilates",
    price: 9800,
    rating: 5.0,
    reviewsCount: 130,
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600",
    badge: "100% Orgánico",
    description: "Limpiador higienizante natural con aceites esenciales desinfectantes sin enjuague. Deja tu mat fresco, libre de bacterias y con aroma relajante.",
    features: ["Fórmula vegana con agua destilada y aceites orgánicos", "Propiedades antisépticas de lavanda y eucalipto", "Envase de 250ml con gatillo pulverizador fino", "Apto para mats de hule, corcho, PVC y TPE"],
    inStock: true
  },
  {
    id: "p9",
    name: "Calza Seamless High-Waist Yoga & Reformer",
    category: "Indumentaria",
    discipline: "Yoga & Pilates",
    price: 28000,
    rating: 4.8,
    reviewsCount: 67,
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=600",
    description: "Calza de tiro alto sin costuras molestas. Tela de compresión suave que no transparenta en ninguna flexión.",
    features: ["Tejido Seamless respirable de secado rápido", "Cintura ancha moldeadora que no se desliza", "Cero transparencias comprobado en flexiones profundas", "Telas suaves al tacto para máximo confort"],
    inStock: true
  }
];

export function Shop() {
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = ["Todos", "Mats", "Accesorios", "Pilates Equipment", "Indumentaria", "Aromaterapia"];
  const disciplines = ["Todas", "Yoga", "Pilates", "Yoga & Pilates"];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    showToast(`¡Añadido "${product.name}" al carrito!`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = PRODUCTS.filter(product => {
    const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
    const matchesDiscipline = selectedDiscipline === "Todas" || product.discipline === selectedDiscipline || product.discipline === "Yoga & Pilates";
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDiscipline && matchesSearch;
  });

  const handleCheckoutMercadoPago = async () => {
    if (cart.length === 0) return;
    setIsProcessingPayment(true);
    try {
      const summaryTitle = `Compra Omia Shop (${cart.length} productos)`;
      const res = await apiFetch("/api/payments/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "shop_order",
          itemId: "order_" + Date.now(),
          title: summaryTitle,
          price: cartTotal
        })
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert("¡Pedido registrado con éxito! Te derivaremos a la confirmación.");
        setCart([]);
        setIsCartOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert("Hubo un error al generar la orden. Probá nuevamente.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    const itemsText = cart.map(i => `• ${i.quantity}x ${i.product.name} ($${(i.product.price * i.quantity).toLocaleString("es-AR")})`).join("\n");
    const fullMessage = `¡Hola Omia Shop! Quisiera encargar el siguiente pedido:\n\n${itemsText}\n\n*Total:* $${cartTotal.toLocaleString("es-AR")}\n\n¿Tienen disponibilidad y envíos? Gracias!`;
    const encoded = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/5491133445566?text=${encoded}`, "_blank");
  };

  return (
    <div className="py-12 px-6 max-w-7xl mx-auto min-h-screen">
      <SEOMeta 
        title="Tienda de Yoga & Pilates | Equipamiento, Mats y Accesorios - Omia"
        description="Comprá el mejor equipamiento para tu práctica de Yoga y Pilates: Mats ecológicos, colchonetas para Reformer, aros Magic Circle, bloques de corcho, indumentaria y aromaterapia."
        keywords="tienda de yoga, productos pilates, mats de yoga, reformer mats, aro de pilates, bloques de corcho, tienda omia"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "itemListElement": PRODUCTS.map((prod, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@type": "Product",
              "name": prod.name,
              "description": prod.description,
              "image": prod.image,
              "offers": {
                "@type": "Offer",
                "priceCurrency": "ARS",
                "price": prod.price,
                "availability": prod.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
              }
            }
          }))
        }}
      />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-[#2C2C2C] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="p-1 bg-[#98A77C] text-white rounded-sm">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="mb-12 bg-gradient-to-r from-[#F4EFE4] via-white to-[#98A77C]/10 p-8 md:p-12 rounded-3xl border border-[#E8E0D0] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <span className="text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-3 block flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Tienda Oficial Omia
          </span>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-[#2C2C2C] mb-4">
            Equipamiento para <span className="italic font-serif">Yoga & Pilates</span>
          </h1>
          <p className="text-[#5D5D5D] text-base md:text-lg leading-relaxed">
            Mats profesionales, accesorios ergonómicos para Reformer y Mat, bloques sustentables de corcho e indumentaria de compresión diseñados para acompañar tu transformación.
          </p>
        </div>

        {/* Cart Quick Button */}
        <div className="relative shrink-0">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-[#2C2C2C] hover:bg-black text-white px-7 py-4 rounded-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-3 cursor-pointer group"
          >
            <ShoppingBag className="w-5 h-5 text-[#98A77C] group-hover:scale-110 transition-transform" />
            <span>Mi Carrito</span>
            {totalItemsCount > 0 && (
              <span className="bg-[#98A77C] text-white text-xs font-bold px-2.5 py-0.5 rounded-sm">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Guarantees Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-[#F4EFE4] border border-[#E8E0D0] p-4 rounded-2xl flex items-center gap-3">
          <Truck className="w-6 h-6 text-[#98A77C] shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-[#2C2C2C]">Envíos a todo el país</h4>
            <p className="text-xs text-[#5D5D5D]">Despacho en 24hs con código de seguimiento.</p>
          </div>
        </div>
        <div className="bg-[#F4EFE4] border border-[#E8E0D0] p-4 rounded-2xl flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#98A77C] shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-[#2C2C2C]">Garantía Omia 30 Días</h4>
            <p className="text-xs text-[#5D5D5D]">Calidad asegurada y cambios sin complicaciones.</p>
          </div>
        </div>
        <div className="bg-[#F4EFE4] border border-[#E8E0D0] p-4 rounded-2xl flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-[#98A77C] shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-[#2C2C2C]">3 Cuotas Sin Interés</h4>
            <p className="text-xs text-[#5D5D5D]">Con Mercado Pago o tarjeta de crédito.</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-6 mb-10">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
          <input 
            type="text"
            placeholder="Buscar productos (ej. 'mat 15mm', 'aro pilates', 'bloque corcho')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F4EFE4] border border-[#E8E0D0] rounded-sm pl-13 pr-6 py-4 outline-none focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] transition-all text-[#2C2C2C] text-base shadow-sm"
          />
        </div>

        {/* Category & Discipline Filter Pills */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Discipline selector */}
          <div className="flex items-center gap-2 bg-[#F4EFE4] p-1.5 rounded-sm border border-[#E8E0D0] self-start">
            <span className="text-xs font-bold text-[#5D5D5D] uppercase tracking-wider px-3">Rubro:</span>
            {disciplines.map(disc => (
              <button
                key={disc}
                onClick={() => setSelectedDiscipline(disc)}
                className={`px-4 py-2 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                  selectedDiscipline === disc 
                    ? "bg-[#2C2C2C] text-white shadow-sm" 
                    : "text-[#5D5D5D] hover:text-[#2C2C2C] hover:bg-neutral-100"
                }`}
              >
                {disc}
              </button>
            ))}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === cat 
                    ? "bg-[#98A77C] text-white border-[#98A77C] shadow-sm" 
                    : "bg-[#F4EFE4] text-[#5D5D5D] border-[#E8E0D0] hover:border-[#98A77C]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <AnimatePresence mode="popLayout">
        {filteredProducts.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredProducts.map(product => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                key={product.id}
                className="bg-white border border-[#E8E0D0] rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Product Image & Badges */}
                <div className="relative h-64 overflow-hidden bg-[#F8F6F0]">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Discipline tag */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-sm text-xs font-semibold text-[#2C2C2C] shadow-sm">
                    {product.discipline}
                  </div>

                  {/* Special Badge if exists */}
                  {product.badge && (
                    <div className="absolute top-4 right-4 bg-[#98A77C] text-white px-3 py-1 rounded-sm text-[11px] font-bold tracking-wider uppercase shadow-sm">
                      {product.badge}
                    </div>
                  )}

                  {/* Quick View Button Overlay */}
                  <button
                    onClick={() => setQuickViewProduct(product)}
                    className="absolute inset-x-6 bottom-4 bg-white/90 hover:bg-white text-[#2C2C2C] py-2.5 rounded-sm text-xs font-bold opacity-0 group-hover:opacity-100 transition-all shadow-md backdrop-blur-sm cursor-pointer"
                  >
                    Vista Rápida
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col justify-between flex-grow">
                  <div>
                    <div className="flex items-center gap-1 mb-2 text-[#98A77C]">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-xs font-bold text-[#2C2C2C]">{product.rating}</span>
                      <span className="text-xs text-[#5D5D5D]">({product.reviewsCount} opiniones)</span>
                    </div>

                    <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2 tracking-tight group-hover:text-[#98A77C] transition-colors">
                      {product.name}
                    </h3>

                    <p className="text-xs text-[#5D5D5D] line-clamp-2 leading-relaxed mb-4">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E8E0D0] flex justify-between items-center gap-4">
                    <div>
                      <span className="text-xs text-[#5D5D5D] block">Precio</span>
                      <strong className="text-xl font-bold text-[#2C2C2C]">
                        ${product.price.toLocaleString("es-AR")}
                      </strong>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      className="bg-[#2C2C2C] hover:bg-black text-white px-5 py-2.5 rounded-sm text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-[#98A77C]" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-20 text-center bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0] max-w-xl mx-auto p-8">
            <ShoppingBag className="w-12 h-12 text-[#E5E5E5] mx-auto mb-3" />
            <h3 className="text-lg font-medium text-[#2C2C2C] mb-1">No se encontraron productos</h3>
            <p className="text-sm text-[#5D5D5D]">Probá ajustando la categoría o borrando la búsqueda.</p>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK VIEW MODAL */}
      <AnimatePresence>
        {quickViewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#E8E0D0] max-w-2xl w-full overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white p-2 rounded-sm text-[#2C2C2C] transition-all cursor-pointer shadow-md"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="h-72 md:h-full relative bg-[#F8F6F0]">
                  <img 
                    src={quickViewProduct.image} 
                    alt={quickViewProduct.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-[#2C2C2C] px-3 py-1 rounded-sm text-xs font-semibold">
                    {quickViewProduct.discipline}
                  </span>
                </div>

                <div className="p-8 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#98A77C] uppercase tracking-wider block mb-1">
                      {quickViewProduct.category}
                    </span>
                    <h2 className="text-2xl font-bold text-[#2C2C2C] mb-2">{quickViewProduct.name}</h2>
                    
                    <div className="flex items-center gap-2 mb-4 text-xs text-[#5D5D5D]">
                      <div className="flex items-center text-[#98A77C]">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-bold ml-1 text-[#2C2C2C]">{quickViewProduct.rating}</span>
                      </div>
                      <span>• {quickViewProduct.reviewsCount} calificaciones</span>
                    </div>

                    <p className="text-sm text-[#5D5D5D] leading-relaxed mb-6">
                      {quickViewProduct.description}
                    </p>

                    <div className="mb-6">
                      <h4 className="text-xs font-bold text-[#2C2C2C] uppercase tracking-wider mb-2">Características clave:</h4>
                      <ul className="space-y-1.5">
                        {quickViewProduct.features.map((f, i) => (
                          <li key={i} className="text-xs text-[#5D5D5D] flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-[#98A77C] shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#E8E0D0] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-[#5D5D5D]">Precio Unitario</span>
                      <p className="text-2xl font-bold text-[#2C2C2C]">${quickViewProduct.price.toLocaleString("es-AR")}</p>
                    </div>

                    <button
                      onClick={() => {
                        addToCart(quickViewProduct);
                        setQuickViewProduct(null);
                      }}
                      className="bg-[#98A77C] hover:bg-[#88976C] text-white px-6 py-3 rounded-sm text-sm font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Agregar al Carrito</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHOPPING CART DRAWER / MODAL */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl relative"
            >
              {/* Cart Drawer Header */}
              <div className="p-6 border-b border-[#E8E0D0] flex justify-between items-center bg-[#F4EFE4]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#98A77C]" />
                  <h3 className="text-lg font-bold text-[#2C2C2C]">Tu Carrito ({totalItemsCount})</h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-[#5D5D5D] hover:text-[#2C2C2C] hover:bg-neutral-100 rounded-sm transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart Drawer Items List */}
              <div className="p-6 overflow-y-auto flex-grow space-y-4">
                {cart.length > 0 ? (
                  cart.map(item => (
                    <div key={item.product.id} className="flex gap-4 p-3 bg-[#F4EFE4] rounded-2xl border border-[#E8E0D0]">
                      <img 
                        src={item.product.image} 
                        alt={item.product.name} 
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-grow flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-semibold text-[#2C2C2C] leading-snug">{item.product.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm font-bold text-[#2C2C2C]">
                            ${(item.product.price * item.quantity).toLocaleString("es-AR")}
                          </span>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 bg-white border border-[#E8E0D0] rounded-sm px-2 py-0.5">
                            <button 
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="text-gray-500 hover:text-black p-1 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="text-gray-500 hover:text-black p-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-[#5D5D5D] flex flex-col items-center gap-3">
                    <ShoppingBag className="w-12 h-12 text-[#E5E5E5]" />
                    <p className="text-sm font-medium">El carrito está vacío</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="text-xs text-[#98A77C] font-bold underline cursor-pointer"
                    >
                      Ver productos de la tienda
                    </button>
                  </div>
                )}
              </div>

              {/* Cart Drawer Footer & Checkout Actions */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-[#E8E0D0] bg-[#F4EFE4] space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold text-[#2C2C2C]">
                    <span>Total Estimado:</span>
                    <span>${cartTotal.toLocaleString("es-AR")}</span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleCheckoutMercadoPago}
                      disabled={isProcessingPayment}
                      className="w-full bg-[#98A77C] hover:bg-[#88976C] text-white py-3.5 rounded-sm font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isProcessingPayment ? "Procesando..." : "Comprar con Mercado Pago"}</span>
                    </button>

                    <button
                      onClick={handleWhatsAppCheckout}
                      className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-sm font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Pedir por WhatsApp Directo</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-center text-[#5D5D5D]">
                    Garantía de devolución de 30 días • Cobros seguros con encriptación SSL.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
