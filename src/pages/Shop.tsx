import { ModalA11y } from "../components/ModalA11y";
import { useContent, Rich } from "../contexts/ContentContext";
import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { startCheckout } from "../hooks/usePlans";
import { 
  ShoppingBag, Search, Filter, Star, Check, Plus, Minus, X, Trash2, 
  Sparkles, ShieldCheck, Truck, ArrowRight, PhoneCall, CreditCard, Heart, ShoppingCart 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SEOMeta } from "../components/SEOMeta";

export interface Product {
  id: string;
  name: string;
  category: string;
  discipline: string;
  price: number;
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

export function Shop() {
  const { t, pairs, img } = useContent();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");

  // Los productos se cargan desde el panel de administración.
  useEffect(() => {
    apiFetch("/api/products")
      .then(res => res.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [ship, setShip] = useState({ method: "envio" as "envio" | "retiro", name: "", phone: "", address: "", city: "", province: "CABA", zip: "" });

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

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
    const matchesDiscipline = selectedDiscipline === "Todas" || product.discipline === selectedDiscipline || product.discipline === "Yoga & Pilates";
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDiscipline && matchesSearch;
  });

  const handleCheckoutMercadoPago = async () => {
    if (cart.length === 0) return;
    if (!ship.name.trim() || !ship.phone.trim() || (ship.method === "envio" && (!ship.address.trim() || !ship.city.trim() || !ship.zip.trim()))) {
      alert("Completá tus datos de contacto y de entrega para continuar.");
      return;
    }
    setIsProcessingPayment(true);
    // Se mandan solo ids y cantidades: el total lo calcula el servidor.
    const error = await startCheckout({
      type: "product",
      items: cart.map(item => ({ id: item.product.id, quantity: item.quantity })),
      shipping: ship
    });
    if (error) alert(error);
    setIsProcessingPayment(false);
  };

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    const itemsText = cart.map(i => `• ${i.quantity}x ${i.product.name} ($${(i.product.price * i.quantity).toLocaleString("es-AR")})`).join("\n");
    const fullMessage = `¡Hola Omia Shop! Quisiera encargar el siguiente pedido:\n\n${itemsText}\n\n*Total:* $${cartTotal.toLocaleString("es-AR")}\n\n¿Tienen disponibilidad y envíos? Gracias!`;
    const encoded = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/${t("contact.whatsapp").replace(/\D/g, "")}?text=${encoded}`, "_blank");
  };

  return (
    <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto min-h-screen">
      <SEOMeta 
        title={t("seo.shop.title")}
        description={t("seo.shop.description")}
        ogImage={img("seo.image")}
        keywords="tienda de yoga, productos pilates, mats de yoga, reformer mats, aro de pilates, bloques de corcho, tienda omia"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "itemListElement": products.map((prod, index) => ({
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
            className="fixed bottom-6 right-6 z-50 bg-bosque text-lino px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="p-1 bg-bosque text-lino rounded-sm">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="mb-12 bg-gradient-to-r from-lino via-white to-salvia/10 p-8 md:p-12 rounded-3xl border border-lino-oscuro flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <span className="text-xs font-bold tracking-widest text-salvia-oscuro uppercase mb-3 block flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            {t("shop.eyebrow")}
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight text-bosque mb-4">
            <Rich text={t("shop.title")} em="text-salvia-oscuro" />
          </h1>
          <p className="text-musgo text-base md:text-lg leading-relaxed">
            {t("shop.subtitle")}
          </p>
        </div>

        {/* Cart Quick Button */}
        <div className="relative shrink-0">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-bosque hover:bg-bosque-profundo text-lino px-7 py-4 rounded-full font-medium transition shadow-md hover:shadow-lg flex items-center gap-3 cursor-pointer group"
          >
            <ShoppingBag className="w-5 h-5 text-salvia-oscuro group-hover:scale-110 transition-transform" />
            <span>Mi Carrito</span>
            {totalItemsCount > 0 && (
              <span className="bg-bosque text-lino text-xs font-bold px-2.5 py-0.5 rounded-sm">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Guarantees Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {pairs("shop.badges").map(({ a: title, b: desc }, i) => {
          const Icon = [Truck, ShieldCheck, CreditCard][i % 3];
          return (
            <div key={i} className="bg-lino border border-lino-oscuro p-4 rounded-2xl flex items-center gap-3">
              <Icon className="w-6 h-6 text-salvia-oscuro shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-bosque">{title}</h4>
                <p className="text-xs text-musgo">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-6 mb-10">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-musgo" />
          <input aria-label="Buscar productos (ej. 'mat 15mm', 'aro pilates', 'bloque corcho')..." 
            type="text"
            placeholder="Buscar productos (ej. 'mat 15mm', 'aro pilates', 'bloque corcho')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-lino border border-lino-oscuro rounded-sm pl-13 pr-6 py-4 outline-none focus:border-salvia focus:ring-1 focus:ring-salvia transition text-bosque text-base shadow-sm"
          />
        </div>

        {/* Category & Discipline Filter Pills */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Discipline selector */}
          <div className="flex items-center gap-2 bg-lino p-1.5 rounded-sm border border-lino-oscuro self-start">
            <span className="text-xs font-bold text-musgo uppercase tracking-wider px-3">Rubro:</span>
            {disciplines.map(disc => (
              <button
                key={disc}
                onClick={() => setSelectedDiscipline(disc)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedDiscipline === disc 
                    ? "bg-bosque text-lino shadow-sm" 
                    : "text-musgo hover:text-bosque hover:bg-neutral-100"
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
                className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                  selectedCategory === cat 
                    ? "bg-bosque text-lino border-salvia shadow-sm" 
                    : "bg-lino text-musgo border-lino-oscuro hover:border-salvia"
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
                className="bg-white border border-lino-oscuro rounded-3xl overflow-hidden hover:shadow-xl transition duration-300 flex flex-col group"
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
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-sm text-xs font-semibold text-bosque shadow-sm">
                    {product.discipline}
                  </div>

                  {/* Special Badge if exists */}
                  {product.badge && (
                    <div className="absolute top-4 right-4 bg-bosque text-lino px-3 py-1 rounded-sm text-[11px] font-bold tracking-wider uppercase shadow-sm">
                      {product.badge}
                    </div>
                  )}

                  {/* Quick View Button Overlay */}
                  <button
                    onClick={() => setQuickViewProduct(product)}
                    className="absolute inset-x-6 bottom-4 bg-white/90 hover:bg-white text-bosque py-2.5 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition shadow-md backdrop-blur-sm cursor-pointer"
                  >
                    Vista Rápida
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col justify-between flex-grow">
                  <div>

                    <h3 className="text-xl font-semibold text-bosque mb-2 tracking-tight group-hover:text-salvia-oscuro transition-colors">
                      {product.name}
                    </h3>

                    <p className="text-xs text-musgo line-clamp-2 leading-relaxed mb-4">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-lino-oscuro flex justify-between items-center gap-4">
                    <div>
                      <span className="text-xs text-musgo block">Precio</span>
                      <strong className="text-xl font-bold text-bosque">
                        ${product.price.toLocaleString("es-AR")}
                      </strong>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      className="bg-bosque hover:bg-bosque-profundo text-lino px-5 py-2.5 rounded-full text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-salvia-oscuro" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-20 text-center bg-lino rounded-3xl border border-lino-oscuro max-w-xl mx-auto p-8">
            <ShoppingBag className="w-12 h-12 text-lino-oscuro mx-auto mb-3" />
            <h3 className="text-lg font-medium text-bosque mb-1">No se encontraron productos</h3>
            <p className="text-sm text-musgo">Probá ajustando la categoría o borrando la búsqueda.</p>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK VIEW MODAL */}
      <AnimatePresence>
        {quickViewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <ModalA11y onClose={() => setQuickViewProduct(null)} label="Vista rápida del producto" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-lino-oscuro max-w-2xl w-full overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white p-2 rounded-full text-bosque transition cursor-pointer shadow-md"
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
                  <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-bosque px-3 py-1 rounded-sm text-xs font-semibold">
                    {quickViewProduct.discipline}
                  </span>
                </div>

                <div className="p-8 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-salvia-oscuro uppercase tracking-wider block mb-1">
                      {quickViewProduct.category}
                    </span>
                    <h2 className="text-2xl font-bold text-bosque mb-2">{quickViewProduct.name}</h2>
                    

                    <p className="text-sm text-musgo leading-relaxed mb-6">
                      {quickViewProduct.description}
                    </p>

                    <div className="mb-6">
                      <h4 className="text-xs font-bold text-bosque uppercase tracking-wider mb-2">Características clave:</h4>
                      <ul className="space-y-1.5">
                        {quickViewProduct.features.map((f, i) => (
                          <li key={i} className="text-xs text-musgo flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-salvia-oscuro shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-lino-oscuro flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-musgo">Precio Unitario</span>
                      <p className="text-2xl font-bold text-bosque">${quickViewProduct.price.toLocaleString("es-AR")}</p>
                    </div>

                    <button
                      onClick={() => {
                        addToCart(quickViewProduct);
                        setQuickViewProduct(null);
                      }}
                      className="bg-bosque hover:bg-bosque-profundo text-lino px-6 py-3 rounded-full text-sm font-semibold transition shadow-md flex items-center gap-2 cursor-pointer"
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
            <ModalA11y onClose={() => setIsCartOpen(false)} label="Carrito de compras" />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl relative"
            >
              {/* Cart Drawer Header */}
              <div className="p-6 border-b border-lino-oscuro flex justify-between items-center bg-lino">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-salvia-oscuro" />
                  <h3 className="text-lg font-bold text-bosque">Tu Carrito ({totalItemsCount})</h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-musgo hover:text-bosque hover:bg-neutral-100 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart Drawer Items List */}
              <div className="p-6 overflow-y-auto flex-grow space-y-4">
                {cart.length > 0 ? (
                  cart.map(item => (
                    <div key={item.product.id} className="flex gap-4 p-3 bg-lino rounded-2xl border border-lino-oscuro">
                      <img 
                        src={item.product.image} 
                        alt={item.product.name} 
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-grow flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-semibold text-bosque leading-snug">{item.product.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm font-bold text-bosque">
                            ${(item.product.price * item.quantity).toLocaleString("es-AR")}
                          </span>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 bg-white border border-lino-oscuro rounded-sm px-2 py-0.5">
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
                  <div className="py-20 text-center text-musgo flex flex-col items-center gap-3">
                    <ShoppingBag className="w-12 h-12 text-lino-oscuro" />
                    <p className="text-sm font-medium">El carrito está vacío</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="text-xs text-salvia-oscuro font-bold underline cursor-pointer"
                    >
                      Ver productos de la tienda
                    </button>
                  </div>
                )}
              </div>

              {/* Cart Drawer Footer & Checkout Actions */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-lino-oscuro bg-lino space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold text-bosque">
                    <span>Subtotal:</span>
                    <span>${cartTotal.toLocaleString("es-AR")}</span>
                  </div>
                  <p className="text-[11px] text-musgo -mt-2">El costo de envío (si corresponde) se suma al pagar.</p>

                  <div className="space-y-2">
                    <div className="flex gap-2 text-xs">
                      {(["envio", "retiro"] as const).map((m) => (
                        <button key={m} type="button" onClick={() => setShip({ ...ship, method: m })}
                          className={`flex-1 py-2 rounded-full border font-semibold ${ship.method === m ? "bg-bosque border-salvia text-lino" : "bg-white border-lino-oscuro text-musgo"}`}>
                          {m === "envio" ? "Envío a domicilio" : "Retiro / a coordinar"}
                        </button>
                      ))}
                    </div>
                    {([["name", "Nombre y apellido"], ["phone", "Teléfono / WhatsApp"], ...(ship.method === "envio" ? [["address", "Calle y número (piso/depto)"], ["city", "Localidad"], ["province", "Provincia"], ["zip", "Código postal"]] : [])] as [keyof typeof ship, string][]).map(([key, label]) => (
                      <input key={key} value={ship[key]} onChange={(e) => setShip({ ...ship, [key]: e.target.value })} placeholder={label}
                        className="w-full bg-white border border-lino-oscuro focus:border-salvia rounded-sm px-3 py-2 text-sm outline-none" />
                    ))}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleCheckoutMercadoPago}
                      disabled={isProcessingPayment}
                      className="w-full bg-bosque hover:bg-bosque-profundo text-lino py-3.5 rounded-full font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isProcessingPayment ? "Procesando..." : "Comprar con Mercado Pago"}</span>
                    </button>

                    {t("contact.whatsapp").replace(/\D/g, "") && <button
                      onClick={handleWhatsAppCheckout}
                      className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-full font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Pedir por WhatsApp Directo</span>
                    </button>}
                  </div>

                  <p className="text-[11px] text-center text-musgo">
                    Podés arrepentirte dentro de los 10 días (botón en el pie del sitio) • Pago seguro con Mercado Pago.
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
