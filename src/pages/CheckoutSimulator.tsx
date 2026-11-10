import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ShieldCheck, CreditCard, Landmark, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function CheckoutSimulator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const type = searchParams.get("type") || "booking";
  const itemId = searchParams.get("itemId") || "";
  const title = searchParams.get("title") || "Servicio Omia Yoga";
  const price = searchParams.get("price") || "8000";
  const prefId = searchParams.get("prefId") || "";
  const tx = searchParams.get("tx") || "";
  const sub = searchParams.get("sub") || "";

  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "transfer">("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formattedPrice = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(parseFloat(price));

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 2000);
  };

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        // Suscripciones: vuelve como lo hace Mercado Pago (?subscription=<id>); compras: con la transacción.
        navigate(sub ? `/perfil?subscription=${sub}` : `/perfil?payment=success&type=${type}&itemId=${itemId}&prefId=${prefId}&tx=${tx}`);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, type, itemId, prefId, tx, sub, navigate]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-bosque font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="bg-[#009EE3] text-white py-4 px-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-2xl tracking-tight italic">mercado pago</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-sm font-medium">Sandbox</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs opacity-90">
            <ShieldCheck className="w-4 h-4 text-[#00E676]" />
            <span>Compra Segura</span>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-grow flex flex-col md:flex-row gap-6">
        {/* Left column: payment details */}
        <div className="flex-1 flex flex-col gap-6">
          {!isSuccess ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-lino-oscuro flex-grow">
              <h2 className="text-xl font-semibold mb-6 text-bosque">¿Cómo querés pagar?</h2>
              
              <div className="flex flex-col gap-4 mb-8">
                {/* Card option */}
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    paymentMethod === "card"
                      ? "border-[#009EE3] bg-[#009EE3]/5 shadow-sm"
                      : "border-lino-oscuro hover:border-gray-300"
                  }`}
                >
                  <div className={`p-3 rounded-sm ${paymentMethod === "card" ? "bg-[#009EE3] text-white" : "bg-gray-100 text-musgo"}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-bosque">Nueva tarjeta de débito o crédito</p>
                    <p className="text-xs text-musgo">Visa, Mastercard, Cabal, etc. Hasta 12 cuotas.</p>
                  </div>
                </button>

                {/* Wallet option */}
                <button
                  onClick={() => setPaymentMethod("wallet")}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    paymentMethod === "wallet"
                      ? "border-[#009EE3] bg-[#009EE3]/5 shadow-sm"
                      : "border-lino-oscuro hover:border-gray-300"
                  }`}
                >
                  <div className={`p-3 rounded-sm ${paymentMethod === "wallet" ? "bg-[#009EE3] text-white" : "bg-gray-100 text-musgo"}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-bosque">Dinero en mi cuenta de Mercado Pago</p>
                    <p className="text-xs text-musgo">Acreditación instantánea y sin comisiones.</p>
                  </div>
                </button>

                {/* Bank transfer option */}
                <button
                  onClick={() => setPaymentMethod("transfer")}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    paymentMethod === "transfer"
                      ? "border-[#009EE3] bg-[#009EE3]/5 shadow-sm"
                      : "border-lino-oscuro hover:border-gray-300"
                  }`}
                >
                  <div className={`p-3 rounded-sm ${paymentMethod === "transfer" ? "bg-[#009EE3] text-white" : "bg-gray-100 text-musgo"}`}>
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-bosque">Transferencia bancaria / DEBIN</p>
                    <p className="text-xs text-musgo">Pagá directo desde tu Home Banking.</p>
                  </div>
                </button>
              </div>

              {/* Form helper */}
              {paymentMethod === "card" && (
                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-lino-oscuro mb-6 flex flex-col gap-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-musgo mb-1 font-medium">Número de tarjeta</label>
                      <input type="text" placeholder="•••• •••• •••• 4242" className="w-full bg-white border border-lino-oscuro rounded-lg px-3 py-2 text-sm outline-none" disabled />
                    </div>
                    <div>
                      <label className="block text-xs text-musgo mb-1 font-medium">Nombre impreso</label>
                      <input type="text" placeholder="COSMO KRAMER" className="w-full bg-white border border-lino-oscuro rounded-lg px-3 py-2 text-sm outline-none" disabled />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">Estamos operando en el entorno seguro simulado de Omia con Mercado Pago.</p>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-[#009EE3] hover:bg-[#008CD0] text-white py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-sm animate-spin" />
                ) : (
                  <>
                    <span>Pagar {formattedPrice}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-lino-oscuro flex-grow flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 min-h-[400px]">
              <div className="w-20 h-20 bg-[#00E676]/10 rounded-sm flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-[#00E676]" />
              </div>
              <h2 className="text-2xl font-bold text-bosque mb-2">¡Pago acreditado!</h2>
              <p className="text-musgo mb-6 max-w-sm">
                Procesamos tu pago de <strong className="text-bosque">{formattedPrice}</strong> con éxito. Te estamos redirigiendo de vuelta a Omia.
              </p>
              <div className="w-24 h-1 bg-gray-100 rounded-sm overflow-hidden">
                <div className="h-full bg-[#009EE3] animate-pulse w-full rounded-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Right column: purchase summary */}
        <div className="w-full md:w-80 shrink-0">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-lino-oscuro sticky top-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Detalle de tu compra</h3>
            
            <div className="border-b border-lino-oscuro pb-4 mb-4">
              <p className="font-semibold text-bosque mb-1">{title}</p>
              <p className="text-xs text-musgo capitalize">Tipo: {type === "subscription" ? "Membresía Omia Pro" : "Reserva Online"}</p>
            </div>

            <div className="flex justify-between items-center text-lg font-bold text-bosque">
              <span>Total</span>
              <span>{formattedPrice}</span>
            </div>
            
            <div className="mt-6 pt-6 border-t border-lino-oscuro text-xs text-musgo flex flex-col gap-2">
              <p>📍 Proveedor: Omia Yoga Argentina</p>
              <p>🔒 Conexión cifrada de 256 bits</p>
              <p>Ref: {prefId}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-lino-oscuro py-4 text-center text-xs text-musgo">
        <div className="max-w-4xl mx-auto px-6">
          <p>© {new Date().getFullYear()} Mercado Pago. Desarrollado e integrado para Omia Yoga Argentina.</p>
        </div>
      </footer>
    </div>
  );
}
